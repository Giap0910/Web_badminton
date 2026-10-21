"""Sinh và fuzz C cho từng module; không gọi HTTP, không mở database."""
import ast
import copy
import csv
import hashlib
import json
import os
from pathlib import Path
import random
import re
import shutil
import struct
import subprocess
import time
import uuid

import module_oracles as oracle

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
OUTPUT = ROOT / 'backend/target/software-security-fuzz'
SERVICES = ROOT / 'backend/src/main/java/com/sports/service'
MODULES = ('voucher', 'loyalty', 'idempotency')
SOURCES = {'voucher': {'VoucherService.java', 'VndAmount.java'},
           'loyalty': {'LoyaltyPolicy.java', 'OrderService.java'},
           'idempotency': {'OrderRequestFingerprint.java', 'OrderService.java'}}
OPS = {ast.Add: '+', ast.Sub: '-', ast.Mult: '*', ast.FloorDiv: '/', ast.And: '&&',
       ast.Or: '||', ast.Lt: '<', ast.LtE: '<=', ast.Gt: '>', ast.GtE: '>=', ast.Eq: '==', ast.NotEq: '!='}
BAD = ('crash', 'timeout', 'invariant_failure', 'oracle_mismatch')

C_HEADER = r'''#include <stdint.h>
#include <inttypes.h>
#include <stdio.h>
#include <string.h>
#define MIN(a,b) ((a)<(b)?(a):(b))
#define MAX(a,b) ((a)>(b)?(a):(b))
'''

C_TRANSPORT = r'''
static uint64_t read_u64(const unsigned char *p) {
    uint64_t value = 0;
    for (int i = 0; i < 8; ++i) value |= ((uint64_t)p[i]) << (8 * i);
    return value;
}
static int64_t read_i64(const unsigned char *p) {
    uint64_t value = read_u64(p);
    return value <= INT64_MAX ? (int64_t)value : -1 - (int64_t)(UINT64_MAX - value);
}
static uint32_t read_u32(const unsigned char *p) {
    return (uint32_t)p[0] | ((uint32_t)p[1]<<8) | ((uint32_t)p[2]<<16) | ((uint32_t)p[3]<<24);
}
static void print_result(Result *out) {
    printf("{\"code\":%d,\"values\":[", out->code);
    for (int i=0; i<OUTPUT_COUNT; ++i) printf("%s%" PRId64, i ? "," : "", out->values[i]);
    printf("],\"target\":%d}\n", out->target);
}
static int decode(const unsigned char *bytes, size_t size) {
    Result out = {9, {0}, 0};
    Input in = {{0}, {{0}}, {0}};
    if (size != INPUT_SIZE || memcmp(bytes, "FZ4M", 4) != 0) { print_result(&out); return 0; }
    for (int i=0; i<FIELD_COUNT; ++i) in.values[i] = read_i64(bytes + 4 + 8*i);
    if (HAS_KEYS) for (int i=0; i<4; ++i) {
        const unsigned char *p = bytes + 4 + 8*FIELD_COUNT + i*84;
        in.lengths[i] = read_u32(p); memcpy(in.keys[i], p+4, 80);
    }
    if (!valid_fixture(&in)) { print_result(&out); return 0; }
    model(&in, &out); print_result(&out); return 0;
}
int main(int argc, char **argv) {
    if (argc != 2) return 64;
    FILE *file = fopen(argv[1], "rb");
    if (file == NULL) return 66;
    unsigned char bytes[INPUT_SIZE+1];
    size_t size = fread(bytes, 1, sizeof bytes, file);
    if (ferror(file)) { fclose(file); return 74; }
    fclose(file); return decode(bytes, size);
}
'''

IDEMPOTENCY_C = r'''
typedef struct { int64_t user, fingerprint; unsigned char key[36]; } Record;
static unsigned char lower_ascii(unsigned char ch) {
    return ch >= 'A' && ch <= 'F' ? (unsigned char)(ch + ('a'-'A')) : ch;
}
static int valid_uuid(Input *in, int request) {
    if (in->lengths[request] != UUID_SIZE) return 0;
    for (int i=0; i<UUID_SIZE; ++i) {
        unsigned char ch=in->keys[request][i];
        if (i==8 || i==13 || i==18 || i==23) { if (ch!='-') return 0; }
        else if (!((ch>='0' && ch<='9') || (ch>='a' && ch<='f') || (ch>='A' && ch<='F'))) return 0;
    }
    return 1;
}
static int same_key(Record *record, Input *in, int request) {
    for (int i=0; i<UUID_SIZE; ++i) if (record->key[i] != lower_ascii(in->keys[request][i])) return 0;
    return 1;
}
static int find_record(Record *records, int count, Input *in, int request) {
    for (int i=0; i<count; ++i)
        if (records[i].user==in->values[USER_INDEX[request]] && same_key(&records[i],in,request)) return i;
    return -1;
}
static int process_request(Record *records, int *count, int64_t *pending, Input *in, int request) {
    if (!valid_uuid(in,request)) return 4;
    int found=find_record(records,*count,in,request);
    int64_t fingerprint=in->values[FINGERPRINT_INDEX[request]], user=in->values[USER_INDEX[request]];
    if (found>=0) return records[found].fingerprint==fingerprint ? 2 : 3;
    if (pending[user]>=PENDING_LIMIT) return 5;
    Record *record=&records[(*count)++]; record->user=user; record->fingerprint=fingerprint;
    for (int i=0; i<UUID_SIZE; ++i) record->key[i]=lower_ascii(in->keys[request][i]);
    pending[user]++; return 1;
}
static void model(Input *in, Result *out) {
    Record records[4]; int count=0;
    int64_t pending[3]={0,in->values[0],in->values[1]};
    out->code=0;
    for (int i=0; i<in->values[2]; ++i) {
        int code=process_request(records,&count,pending,in,i);
        out->values[code-1]++; out->values[5+i]=code;
    }
    out->target=out->values[1]>0;
}
'''


def load_spec(module, path=None):
    if module not in MODULES:
        raise ValueError('Module không được hỗ trợ')
    spec = json.loads(Path(path or HERE / f'{module}_spec.json').read_text(encoding='utf-8'))
    if spec.get('module') != module or spec.get('version') != 1 or set(spec['backend_sha256']) != SOURCES[module]:
        raise ValueError('Đặc tả hoặc danh sách baseline không hợp lệ')
    for name, digest in spec['backend_sha256'].items():
        if hashlib.sha256((SERVICES / name).read_bytes()).hexdigest() != digest:
            raise ValueError(f'Backend {name} đã đổi; cần đối chiếu lại đặc tả {module}')
    validate_fields(spec)
    return spec


def validate_fields(spec):
    for name, limits in spec['fields'].items():
        if not re.fullmatch(r'[a-z][a-z0-9_]*', name) or name in ('int', 'return', 'if', 'while'):
            raise ValueError('Tên trường không hợp lệ')
        if len(limits) != 3 or any(type(value) is not int for value in limits):
            raise ValueError('Miền dữ liệu phải có min, max, default nguyên')
        if not -2 <= limits[0] <= limits[2] <= limits[1] <= 10000000000:
            raise ValueError('Miền số ngoài phạm vi mô hình int64 được hỗ trợ')
    if spec['module'] == 'idempotency' and (spec['uuid_size'] != 36 or not 1 <= spec['pending_limit'] <= 3):
        raise ValueError('Cấu hình UUID hoặc pending không hợp lệ')


def expression(node, names):
    if isinstance(node, ast.Constant) and type(node.value) is int and 0 <= node.value <= 10000000000:
        return f'INT64_C({node.value})'
    if isinstance(node, ast.Name) and node.id in names:
        return f's->{node.id}'
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.Not, ast.USub)):
        return f'({"!" if isinstance(node.op, ast.Not) else "-"}{expression(node.operand, names)})'
    if isinstance(node, ast.BinOp) and type(node.op) in (ast.Add, ast.Sub, ast.Mult, ast.FloorDiv):
        if isinstance(node.op, ast.FloorDiv) and not (isinstance(node.right, ast.Constant) and node.right.value > 0):
            raise ValueError('Chỉ chia cho hằng số nguyên dương')
        return f'({expression(node.left, names)} {OPS[type(node.op)]} {expression(node.right, names)})'
    if isinstance(node, ast.BoolOp):
        return '(' + f' {OPS[type(node.op)]} '.join(expression(v, names) for v in node.values) + ')'
    if isinstance(node, ast.Compare) and len(node.ops) == 1 and type(node.ops[0]) in OPS:
        return f'({expression(node.left,names)} {OPS[type(node.ops[0])]} {expression(node.comparators[0],names)})'
    if isinstance(node, ast.IfExp):
        return f'({expression(node.test,names)} ? {expression(node.body,names)} : {expression(node.orelse,names)})'
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in ('min', 'max') and len(node.args) == 2 and not node.keywords:
        return f'{node.func.id.upper()}({expression(node.args[0],names)},{expression(node.args[1],names)})'
    raise ValueError('Biểu thức ngoài tập con an toàn')


def translate(text, names):
    if not isinstance(text, str) or len(text) > 700:
        raise ValueError('Biểu thức sai kiểu hoặc quá dài')
    node = ast.parse(text, mode='eval')
    if len(list(ast.walk(node))) > 120:
        raise ValueError('Biểu thức quá phức tạp')
    return expression(node.body, names)


def emit_rule(rule, names):
    if 'return' in rule:
        if type(rule['return']) is not int or not 0 <= rule['return'] <= 9:
            raise ValueError('Mã kết quả không hợp lệ')
        text = f"return {rule['return']};"
    else:
        if rule['set'] not in names:
            raise ValueError('Tên biến cập nhật không hợp lệ')
        text = f"s->{rule['set']} = {translate(rule['value'], names)};"
    return f"    if ({translate(rule['when'], names)}) {{ {text} }}" if 'when' in rule else '    ' + text


def numeric_model(spec):
    names = set(spec['fields']) | set(spec['locals'])
    declarations = ', '.join(spec['fields']) + ', ' + ', '.join(spec['locals'])
    head = f'typedef struct {{ int64_t {declarations}; }} State;\n'
    rules = '\n'.join(emit_rule(rule, names) for rule in spec['rules'])
    function = f'static int rules(State *s) {{\n{rules}\n    return 0;\n}}\n'
    values = [f'in->values[{i}]' for i in range(len(spec['fields']))] + [str(v) for v in spec['locals'].values()]
    body = ['static void model(Input *in, Result *out) {', '    State storage = {' + ','.join(values) + '};',
            '    State *s = &storage;', '    out->code = rules(s);']
    body += [f'    out->values[{i}] = s->{name};' for i, name in enumerate(spec['outputs'])]
    body += [f"    out->target = out->code == 0 && ({translate(spec['target'],names)});", '}']
    return head + function + '\n'.join(body)


def idempotency_model(spec):
    fields = list(spec['fields'])
    users = ','.join(str(fields.index(f'user_{i}')) for i in range(4))
    fingerprints = ','.join(str(fields.index(f'fingerprint_{i}')) for i in range(4))
    definitions = f"#define UUID_SIZE {spec['uuid_size']}\n#define PENDING_LIMIT {spec['pending_limit']}\n"
    definitions += f'static const int USER_INDEX[4]={{{users}}}, FINGERPRINT_INDEX[4]={{{fingerprints}}};\n'
    return definitions + IDEMPOTENCY_C


def generate(spec):
    validate_fields(spec)
    fields, outputs = len(spec['fields']), len(spec['outputs'])
    keys = int(spec['module'] == 'idempotency')
    size = 4 + fields * 8 + keys * 4 * 84
    digest = hashlib.sha256(json.dumps(spec, sort_keys=True).encode()).hexdigest()
    head = f'/* Generated specification SHA256: {digest}. */\n' + C_HEADER
    head += f'#define FIELD_COUNT {fields}\n#define OUTPUT_COUNT {outputs}\n#define HAS_KEYS {keys}\n#define INPUT_SIZE {size}\n'
    head += 'typedef struct { int64_t values[FIELD_COUNT]; unsigned char keys[4][80]; uint32_t lengths[4]; } Input;\n'
    head += 'typedef struct { int code; int64_t values[OUTPUT_COUNT]; int target; } Result;\n'
    guards = [f'(in->values[{i}] >= INT64_C({v[0]}) && in->values[{i}] <= INT64_C({v[1]}))'
              for i, v in enumerate(spec['fields'].values())]
    head += 'static int valid_fixture(Input *in) {\n    return ' + ' &&\n        '.join(guards) + ';\n}\n'
    model = idempotency_model(spec) if keys else numeric_model(spec)
    return head + model + C_TRANSPORT


def execute(binary, data, directory, index):
    path = directory / f'input-{index:05}.bin'
    path.write_bytes(data)
    try:
        process = subprocess.run([str(binary), str(path)], cwd=directory, capture_output=True,
                                 timeout=2, text=True, encoding='utf-8', errors='replace')
    except subprocess.TimeoutExpired:
        return 'timeout', {}, ''
    if process.returncode < 0 or process.returncode >= 0x80000000:
        return 'crash', {}, process.stdout + process.stderr
    if process.returncode:
        raise RuntimeError(f'Target lỗi môi trường: mã {process.returncode}, {process.stderr}')
    try:
        return 'ok', json.loads(process.stdout), process.stdout
    except json.JSONDecodeError:
        return 'oracle_mismatch', {}, process.stdout + process.stderr


def checked_execute(spec, binary, data, directory, index):
    outcome, actual, log = execute(binary, data, directory, index)
    if outcome == 'ok' and not valid_result(spec, data, actual):
        return 'invariant_failure', actual, log
    if outcome == 'ok' and actual != oracle.expected(spec, data):
        return 'oracle_mismatch', actual, log
    return outcome, actual, log


def valid_result(spec, data, actual):
    if set(actual) != {'code', 'values', 'target'} or type(actual['code']) is not int:
        return False
    values = actual['values']
    if not isinstance(values, list) or len(values) != len(spec['outputs']) or any(type(v) is not int for v in values):
        return False
    if type(actual['target']) is not int or actual['target'] not in (0, 1):
        return False
    if actual['code'] != 0:
        return actual['target'] == 0
    if any(value < 0 for value in values): return False
    case = oracle.decode(spec, data)
    if case is None: return False
    if spec['module'] == 'voucher':
        return values[1] <= values[2] and values[4] <= 2147483647 and (case['action'] >= 2 or values[0] <= case['total'])
    if spec['module'] == 'loyalty':
        return values[1] <= case['merchandise'] // 10 and values[1] <= values[0] * 100
    return sum(values[:5]) == case['request_count'] and all(value <= 4 for value in values[:5])


def mutate_case(spec, case, rng):
    case = copy.deepcopy(case)
    if spec['module'] == 'idempotency' and rng.randrange(4) == 0:
        index = rng.randrange(4)
        case['keys'][index] = rng.choice(['', 'invalid', 'ABCDEF01-2345-6789-abcd-0123456789ab',
                                        'abcdef01-2345-6789-abcd-0123456789ab',
                                        '12345678-2345-6789-abcd-0123456789ab', 'x' * 81])
    else:
        name = rng.choice(list(spec['fields']))
        low, high, default = spec['fields'][name]
        candidates = [low, high, default, 0, 1, 2, 3, 9, 10, 99, 100, 999, 1000, 9999, 10000, 999999, 1000000]
        case[name] = rng.choice([v for v in candidates if low <= v <= high])
    return case


def candidate(spec, rng, corpus, mode, input_mode):
    if input_mode == 'raw':
        data = bytearray(rng.choice(corpus))
        for _ in range(1 if mode == 'coverage-guided' else rng.randint(1, 5)):
            data[rng.randrange(len(data))] = rng.randrange(256)
        return bytes(data)
    case = oracle.decode(spec, rng.choice(corpus)) if mode == 'coverage-guided' else oracle.defaults(spec)
    if spec['module'] == 'idempotency' and isinstance(case['keys'][0], bytes):
        case['keys'] = [key.decode('utf-8', errors='replace') for key in case['keys']]
    for _ in range(1 if mode == 'coverage-guided' else rng.randint(1, 4)):
        case = mutate_case(spec, case, rng)
    return oracle.pack_case(spec, case)


def campaign(spec, binary, directory, args, mode, seed):
    import fuzz_runner as stock
    rng, corpus = random.Random(seed), [oracle.pack_case(spec, oracle.defaults(spec))]
    seen_lines, seen_branches, counts = set(), set(), dict.fromkeys(BAD, 0)
    first, used, start = None, 0, time.perf_counter()
    with (directory / 'events.csv').open('w', newline='', encoding='utf-8') as stream:
        writer = csv.writer(stream); writer.writerow(['iteration','seconds','outcome','code','lines','branches'])
        for index in range(1, args.iterations + 1):
            if time.perf_counter() - start >= args.seconds: break
            data = candidate(spec, rng, corpus, mode, args.input_mode)
            outcome, actual, log = checked_execute(spec, binary, data, directory, index)
            lines, branches, all_lines, all_branches = stock.coverage(directory, args.gcov, spec['module'] + '_simulator.c')
            if mode == 'coverage-guided' and (lines - seen_lines or branches - seen_branches): corpus.append(data)
            seen_lines.update(lines); seen_branches.update(branches)
            if actual.get('target') and first is None:
                first = {'iteration': index, 'seconds': time.perf_counter() - start}
                (directory / 'target-input.bin').write_bytes(data)
            used = index; writer.writerow([index,time.perf_counter()-start,outcome,actual.get('code'),len(seen_lines),len(seen_branches)])
            if outcome != 'ok':
                counts[outcome] += 1; (directory / 'failure.txt').write_text(log, encoding='utf-8'); break
    if used == 0: raise RuntimeError('Ngân sách hết trước input đầu tiên; chưa có kết quả fuzz')
    return dict(mode=mode, input_mode=args.input_mode, seed=seed, iterations=used, seconds=time.perf_counter()-start,
                first_target=first, line_hits=len(seen_lines), line_total=len(all_lines), branch_hits=len(seen_branches),
                branch_total=len(all_branches), corpus=len(corpus), **counts)


def regressions(spec, binary, directory):
    cases, rows = [], []
    for test in spec['cases']:
        case = oracle.defaults(spec); case.update(test['input'])
        actual = oracle.expected(spec, oracle.pack_case(spec, case))
        if any(actual[key] != value for key, value in test['expected'].items()):
            raise RuntimeError('Golden case không khớp oracle: ' + test['id'])
        cases.append((test['id'], oracle.pack_case(spec, case)))
    cases += [('invalid-length', b''), ('invalid-header', bytes(len(cases[0][1])))]
    for index, (name, data) in enumerate(cases):
        outcome, actual, log = checked_execute(spec, binary, data, directory, index)
        rows.append({'case': name, 'input_hex': data.hex(), 'outcome': outcome, 'result': actual, 'log': log})
    (directory / 'regression.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf-8')
    if any(row['outcome'] != 'ok' for row in rows): raise RuntimeError('Hồi quy không đạt: ' + str(directory))
    return len(rows)


def metadata(spec, directory, args, source):
    files = [HERE / f"{spec['module']}_spec.json", Path(__file__), HERE / 'module_oracles.py',
             HERE / 'fuzz_runner.py', HERE / 'generate_simulator.py']
    for path in files: shutil.copyfile(path, directory / path.name)
    info = {'module': spec['module'], 'scope': spec['description'], 'backend': spec['backend_sha256'],
            'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
            'files': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in files},
            'budget': {'iterations': args.iterations, 'seconds': args.seconds, 'seeds': args.seeds, 'input_mode': args.input_mode},
            'gcc': subprocess.check_output([args.gcc, '--version'], text=True).splitlines()[0],
            'gcov': subprocess.check_output([args.gcov, '--version'], text=True).splitlines()[0],
            'claim': 'Simulator C; chưa kiểm thử API hoặc xác nhận chạy trong GUI.'}
    (directory / 'metadata.json').write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding='utf-8')


def run_module(module, args, destination):
    import fuzz_runner as stock
    spec = load_spec(module)
    directory = destination / module; directory.mkdir()
    name = module + '_simulator'
    source = directory / (name + '.c'); source.write_text(generate(spec), encoding='utf-8')
    metadata(spec, directory, args, source)
    regression = directory / 'regression'; regression.mkdir()
    binary = stock.compile_target(regression, args.gcc, source, name)
    count = regressions(spec, binary, regression)
    results = []
    for seed in args.seeds:
        for mode in ('black-box', 'coverage-guided'):
            path = directory / f'{mode}-{seed}'; path.mkdir()
            binary = stock.compile_target(path, args.gcc, source, name)
            results.append(campaign(spec, binary, path, args, mode, seed))
            if any(results[-1][key] for key in BAD): break
        if any(results[-1][key] for key in BAD): break
    report = {'module': module, 'regressions': count, 'results': results,
              'claim': 'Simulator C; không phải kết quả API, sanitizer hoặc GUI.'}
    save_report(directory, report)
    return directory, report


def save_report(directory, report):
    (directory / 'summary.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    with (directory / 'summary.csv').open('w', newline='', encoding='utf-8-sig') as stream:
        writer = csv.DictWriter(stream, fieldnames=report['results'][0].keys())
        writer.writeheader(); writer.writerows(report['results'])


def teacher_tables(module):
    import generate_simulator
    spec = load_spec(module)
    tables = {name: [rows[0]] for name, rows in generate_simulator.load_spec()['teacher_tables'].items()}
    tables['ThongTin'] += [['name', 'badminton_' + module], ['description', spec['description']],
        ['pipeline', 'JSON → bộ sinh riêng → simulator C → runner Python. Excel là đặc tả, không tự cập nhật theo fuzz.'],
        ['gui_limit', 'Ứng dụng thầy chỉ sinh một hàm cộng C minh họa; không chạy toàn bộ simulator này. Chương 4 có thể trống.'],
        ['outputs', ', '.join(spec['outputs'])], ['backend_sha256', json.dumps(spec['backend_sha256'])]]
    tables['YeuCauChucNang'] += [[key, text, 'safety', 'HIGH'] for key, text in spec['requirements']]
    tables['YeuCauPhiChucNang'] += [['NFR-1', 'Timeout 2 giây/tiến trình mục tiêu; không phải SLA của website.', 'MEDIUM'],
        ['NFR-2', 'So sánh black-box và coverage-guided với seed 1, 7, 42.', 'MEDIUM']]
    tables['RangBuoc'] += [[f'CON-{i+1}', text, 'HIGH'] for i, text in enumerate(excel_constraints(spec))]
    tables['MoHinhTrangThai'] += [['ready', 'x', 'ready', 'accepted, rejected'],
        ['accepted', '', 'accepted', 'accepted'], ['rejected', '', 'rejected', 'rejected']]
    tables['ThuocTinhAnToan'] += [['EF(accepted)'], ['EF(rejected)'], ['AG(!(accepted & rejected))']]
    tables['LoaiTruLanNhau'] += [['accepted', 'rejected']]
    tables['HamSinhMa'] += [[module + '_sum_fragment', 'c', 'arithmetic', 'a, b', None, None, None, None]]
    condition = {'voucher': 'a >= 0 and a <= 2147483646 and b == 1 and a + b > 2147483647',
        'loyalty': 'a >= 0 and a <= 1000000 and b >= 0 and b <= 1000000 and a + b > 2147483647',
        'idempotency': 'a >= 0 and a < 3 and b == 1 and a + b > 3'}[module]
    tables['KiemTraSoHoc'] += [[module + '_bounded_sum', 'a, b', condition, None]]
    tables['TestCase'] += [excel_case(case) for case in spec['cases']]
    return tables


def excel_constraints(spec):
    return [spec['description'], 'Đầu vào FZ4M nhị phân cho C; không phải JSON gửi API website.',
        'Oracle Python viết độc lập; đối chiếu hash backend trước khi chạy. Chưa kiểm thử HTTP/DB cho module mới.',
        'Đồ thị accepted/rejected chỉ trừu tượng hóa một thao tác, không chứng minh các nhánh C hoặc bất biến số học.',
        'HamSinhMa chỉ minh họa phép cộng: used + 1, tổng điểm đã dùng, hoặc pending + 1 tùy module.',
        'KiemTraSoHoc chỉ truy vấn tổng có chặn; không kiểm chứng toàn bộ module. Không tự gán CVE cho website.',
        'TestCase trong Excel chỉ được tài liệu hóa bởi ứng dụng; thực thi ca C bằng runner riêng.']


def excel_case(case):
    return [case['id'], case['req'], case['title'],
        'Ghi đè trên fixture mặc định trong JSON: ' + json.dumps(case['input'], ensure_ascii=False),
        'Sinh C từ JSON\nChạy hồi quy C bằng runner riêng\nĐối chiếu với oracle độc lập',
        json.dumps(case['expected'], ensure_ascii=False), 'HIGH']


def combined_tables():
    import generate_simulator
    sources = dict(stock=generate_simulator.load_spec()['teacher_tables'],
                   **{module: teacher_tables(module) for module in MODULES})
    result = {name: [rows[0]] for name, rows in sources['stock'].items()}
    result['ThongTin'] += [['name', 'badminton_four_modules'],
        ['description', 'Bốn mô hình C: tồn kho, voucher, loyalty, idempotency. Excel là đặc tả tổng hợp, không phải kết quả fuzz.'],
        ['gui_limit', 'Mã C trong GUI chỉ là các hàm cộng minh họa; fuzz toàn bộ simulator bằng runner riêng. Chương 4 GUI có thể trống.'],
        ['state_limit', 'Đồ thị ghép các mô hình độc lập qua start; không kiểm chứng tương tác giữa bốn module.']]
    result['MoHinhTrangThai'].append(['start', 'x', 'start', ', '.join(name + '_ready' for name in sources)])
    for module, tables in sources.items():
        append_module_tables(result, module, tables)
    return result


def append_module_tables(result, module, tables):
    states = {row[0] for row in tables['MoHinhTrangThai'][1:]}
    prefix = lambda text: re.sub(r'\b(' + '|'.join(map(re.escape, states)) + r')\b',
                                  lambda match: module + '_' + match[0], text)
    for name, rows in tables.items():
        for original in rows[1:]:
            row = original.copy()
            if name == 'ThongTin':
                result[name].append([module + '_' + row[0], row[1]]); continue
            if name == 'MoHinhTrangThai':
                row = [prefix(row[0]), '', prefix(row[2]), prefix(row[3])]
            elif name in ('ThuocTinhAnToan', 'LoaiTruLanNhau'):
                row = [prefix(value) for value in row]
                if row == ['AG(!violation)']: continue
            elif name in ('YeuCauPhiChucNang', 'RangBuoc'):
                row[0] = module.upper() + '-' + row[0]
            result[name].append(row)


def run_selected(args):
    import fuzz_runner as stock
    args.gcc, args.gcov = shutil.which(args.gcc), shutil.which(args.gcov)
    if not args.gcc or not args.gcov: raise RuntimeError('Cần GCC/gcov khả dụng')
    os.environ['PATH'] = str(Path(args.gcc).parent) + os.pathsep + os.environ.get('PATH', '')
    destination = OUTPUT / ('modules-' + time.strftime('%Y%m%d-%H%M%S') + '-' + uuid.uuid4().hex[:8])
    destination.mkdir(parents=True)
    reports = []
    selected = ('stock',) + MODULES if args.module == 'all' else (args.module,)
    for module in selected:
        if module == 'stock':
            status = stock.run(args); directory = Path(args.last_output)
            report = json.loads((directory / 'summary.json').read_text(encoding='utf-8'))
        else:
            directory, report = run_module(module, args, destination)
            status = int(any(row[key] for row in report['results'] for key in BAD))
        reports.append({'module': module, 'directory': str(directory), 'status': 'pass' if status == 0 else 'fail', 'report': report})
        print(f'{module}: {reports[-1]["status"]} - {directory}', flush=True)
        (destination / 'summary.json').write_text(json.dumps(reports, ensure_ascii=False, indent=2), encoding='utf-8')
        if status: return status
    print(destination)
    return 0
