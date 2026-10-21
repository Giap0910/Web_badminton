"""Oracle độc lập cho các mô hình mới; không diễn giải rules của bộ sinh."""
import re
import struct

MAX_VND = 9999999999
MAX_INT = 2147483647
KEY_BYTES = 80


def result(code, values, target=False):
    return {'code': code, 'values': values, 'target': int(target and code == 0)}


def defaults(spec):
    case = {name: limits[2] for name, limits in spec['fields'].items()}
    if spec['module'] == 'idempotency':
        case['keys'] = ['ABCDEF01-2345-6789-abcd-0123456789ab'] * 4
    return case


def pack_case(spec, case):
    values = [case[name] for name in spec['fields']]
    data = b'FZ4M' + struct.pack('<' + 'q' * len(values), *values)
    if spec['module'] == 'idempotency':
        for key in case['keys']:
            raw = key.encode('utf-8')
            data += struct.pack('<I', len(raw)) + raw[:KEY_BYTES].ljust(KEY_BYTES, b'\0')
    return data


def decode(spec, data):
    count = len(spec['fields'])
    size = 4 + count * 8 + (4 * (KEY_BYTES + 4) if spec['module'] == 'idempotency' else 0)
    if len(data) != size or data[:4] != b'FZ4M':
        return None
    values = struct.unpack('<' + 'q' * count, data[4:4 + count * 8])
    case = dict(zip(spec['fields'], values))
    if any(not limits[0] <= case[name] <= limits[1] for name, limits in spec['fields'].items()):
        return None
    if spec['module'] == 'idempotency':
        case['keys'] = decode_keys(data[4 + count * 8:])
    return case


def decode_keys(data):
    keys = []
    for index in range(4):
        offset = index * (KEY_BYTES + 4)
        length = struct.unpack('<I', data[offset:offset + 4])[0]
        keys.append(data[offset + 4:offset + 4 + min(length, KEY_BYTES)] if length <= KEY_BYTES else b'!')
    return keys


def expected(spec, data):
    case = decode(spec, data)
    if case is None:
        return result(9, [0] * len(spec['outputs']))
    return {'voucher': voucher, 'loyalty': loyalty, 'idempotency': idempotency}[spec['module']](case)


def voucher(case):
    used = 0 if case['used'] == -1 else case['used']
    if case['action'] >= 2:
        return result(0, [0, 0, 0, 0, max(used - (case['action'] - 1), 0)])
    invalid = voucher_configuration(case, used)
    if invalid:
        return result(1, [0, 0, 0, 0, used])
    unavailable = case['active'] == 0 or case['expiry'] < 0 or used == MAX_INT
    if unavailable or case['maximum'] != -1 and used >= case['maximum']:
        return result(2, [0, 0, 0, 0, used])
    if case['minimum'] != -1 and case['total'] < case['minimum']:
        return result(3, [0, 0, 0, 0, used])
    return voucher_discount(case, used)


def voucher_configuration(case, used):
    if not 0 <= case['total'] <= MAX_VND or case['kind'] > 2:
        return True
    if not -1 <= case['cap'] <= MAX_VND or not -1 <= case['minimum'] <= MAX_VND:
        return True
    if used < 0 or case['maximum'] < -1 or case['maximum'] != -1 and case['maximum'] < used:
        return True
    if case['kind'] == 1:
        return not 1 <= case['value'] <= 10000
    return not 0 <= case['value'] <= MAX_VND or case['kind'] == 2 and case['value'] == 0


def voucher_discount(case, used):
    total, kind = case['total'], case['kind']
    discount = min(case['value'], total) if kind == 0 else 0
    if kind == 1:
        discount = total * case['value'] // 10000
        if case['cap'] >= 0:
            discount = min(discount, case['cap'])
        if discount == 0:
            return result(4, [0, 0, 0, 0, used])
    shipping = 0 if total == 0 or total >= 1000000 else 30000
    if kind == 2 and shipping == 0:
        return result(5, [0, 0, 0, 0, used])
    reduction = min(case['value'], shipping) if kind == 2 else 0
    return result(0, [discount, reduction, shipping, total - discount, used + (case['action'] == 1)], kind == 1 and discount > 0)


def loyalty(case):
    paid, held = 0, 0
    for index in range(4):
        if case[f'cancelled_{index}']:
            continue
        held += max(case[f'used_{index}'], 0)
        if case[f'recognized_{index}']:
            paid += max(case[f'total_{index}'] - case[f'shipping_{index}'], 0)
    earned = paid // 10000
    available = max(earned - held, 0)
    points = case['points']
    valid = 0 <= points <= min(1000000, available, case['merchandise'] // 1000)
    return result(0 if valid else 1, [available, points * 100 if valid else 0, earned, held], valid and points > 0)


def idempotency(case):
    records, pending = {}, {1: case['pending_1'], 2: case['pending_2']}
    counts, codes = [0] * 5, [0] * 4
    for index in range(case['request_count']):
        key = case['keys'][index]
        if not re.fullmatch(rb'[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}', key):
            code = 4
        else:
            code = replay_or_create(case, index, key.lower(), records, pending)
        codes[index] = code
        counts[code - 1] += 1
    return result(0, counts + codes, counts[1] > 0)


def replay_or_create(case, index, key, records, pending):
    user, fingerprint = case[f'user_{index}'], case[f'fingerprint_{index}']
    identity = user, key
    if identity in records:
        return 2 if records[identity] == fingerprint else 3
    if pending[user] >= 3:
        return 5
    records[identity] = fingerprint
    pending[user] += 1
    return 1
