"""Kiểm tra đặc tả, sinh mã và đối chiếu C sinh ra với oracle độc lập."""
import copy
import ctypes
import json
import os
from pathlib import Path
import subprocess
import unittest
import uuid
from unittest.mock import patch

import fuzz_runner as runner
import generate_simulator as generator


class GeneratorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.spec = generator.load_spec()
        cls.directory = runner.OUTPUT / ('generator-tests-' + uuid.uuid4().hex[:8])
        cls.directory.mkdir(parents=True)
        cls.gcc = runner.OUTPUT / 'toolchain/mingw64/bin/gcc.exe'
        os.environ['PATH'] = str(cls.gcc.parent) + os.pathsep + os.environ.get('PATH', '')

    def compile_spec(self, spec, label):
        directory = self.directory / label
        directory.mkdir()
        source = directory / 'generated.c'
        source.write_text(generator.generate(spec), encoding='utf-8')
        return runner.compile_target(directory, str(self.gcc), source), directory

    def test_backend_fingerprint(self):
        self.assertEqual(len(self.spec['backend_sha256']), 2)

    def test_reject_arbitrary_code(self):
        for text in ('__import__("os")', 'q.__class__', 'q * q', 'unknown', '2147483648'):
            with self.subTest(text=text), self.assertRaises(ValueError):
                generator.translate(text)

    def test_generation_is_deterministic(self):
        self.assertEqual(generator.generate(self.spec), generator.generate(copy.deepcopy(self.spec)))

    def test_generated_regressions(self):
        binary, directory = self.compile_spec(self.spec, 'regression')
        self.assertEqual(runner.regressions(binary, directory), 25)

    def test_spec_changes_executed_behavior(self):
        changed = copy.deepcopy(self.spec)
        changed['operations']['reserve'][0]['when'] = 'q < 1 or q > 50'
        binary, directory = self.compile_spec(changed, 'changed-limit')
        data = directory / 'quantity-51.bin'
        data.write_bytes(runner.pack(100, 0, 100, 0, 51, 0))
        process = subprocess.run([str(binary), str(data)], capture_output=True, text=True, timeout=2)
        self.assertEqual(process.returncode, 0)
        self.assertEqual(json.loads(process.stdout)['status'], 'rejected')
        self.assertEqual(runner.oracle(data.read_bytes())[0], 'accepted')

    def test_operation_sets_are_present(self):
        source = generator.generate(self.spec)
        self.assertIn('static int reserve(', source)
        self.assertIn('static int settle(', source)
        self.assertNotEqual(source, runner.SOURCE.read_text(encoding='utf-8'))

    def test_handwritten_business_rules_are_not_copied(self):
        expected = generator.generate(self.spec)
        adapter = runner.SOURCE.read_text(encoding='utf-8').replace('q > 100', 'q > 3')
        with patch.object(Path, 'read_text', return_value=adapter):
            self.assertEqual(generator.generate(self.spec), expected)

    def test_backend_change_stops_generation(self):
        changed = copy.deepcopy(self.spec)
        changed['backend_sha256']['OrderService.java'] = '0' * 64
        path = self.directory / 'stale-spec.json'
        path.write_text(json.dumps(changed), encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'đã đổi'):
            generator.load_spec(path)

    def test_requirement_traceability(self):
        tables = self.spec['teacher_tables']
        requirements = {row[0] for row in tables['YeuCauChucNang'][1:]}
        cases = {row[0]: row[1] for row in tables['TestCase'][1:]}
        self.assertEqual(len(tables), 10)
        self.assertEqual({row['requirement'] for row in self.spec['traceability']}, requirements)
        for row in self.spec['traceability']:
            self.assertEqual(cases[row['cases']], row['requirement'])

    def test_json_adapter_and_wrap(self):
        import stock_json_fuzz as target
        directory = self.directory / 'json'; directory.mkdir()
        source = directory / 'generated-json.c'
        source.write_text(generator.generate_json(self.spec), encoding='utf-8')
        binary = runner.compile_target(directory, str(self.gcc), source, 'stock_json_target')
        self.assertEqual(target.regressions(binary, directory), len(target.golden_cases()))
        self.assertEqual(target.shared_check(source, directory, str(self.gcc)), len(target.golden_cases()) - 1)

    def test_json_spec_changes_c_behavior(self):
        import stock_json_fuzz as target
        changed = copy.deepcopy(self.spec)
        changed['operations']['reserve'][0]['when'] = 'q < 1 or q > 50'
        directory = self.directory / 'json-changed'; directory.mkdir()
        source = directory / 'changed.c'
        source.write_text(generator.generate_json(changed), encoding='utf-8')
        binary = runner.compile_target(directory, str(self.gcc), source, 'stock_json_target')
        value = dict(target.fixture(51), available=100)
        outcome, actual, _ = target.execute(binary, target.encode(value), directory, 0)
        self.assertEqual(outcome, 'oracle_mismatch')
        self.assertEqual(actual['code'], 1)

    def test_json_bounds_cannot_silently_drift(self):
        changed = copy.deepcopy(self.spec)
        changed['json_transport']['max_records'] = 1000
        with self.assertRaisesRegex(ValueError, 'Giới hạn JSON'):
            generator.generate_json(changed)

    def json_library(self, source, label):
        directory = self.directory / label; directory.mkdir()
        path = directory / 'target.c'; path.write_text(source,encoding='utf-8')
        library = directory / 'target.dll'
        process = subprocess.run([str(self.gcc),'-std=c11','-Wall','-Wextra','-Werror','-shared',str(path),'-o',str(library)],
                                 capture_output=True,text=True)
        self.assertEqual(process.returncode,0,process.stderr)
        target = ctypes.CDLL(str(library))
        target.stock_json.argtypes, target.stock_json.restype = [ctypes.c_char_p], ctypes.c_int
        return target

    def test_json_allocation_failure(self):
        import stock_json_fuzz as target
        source = generator.generate_json(self.spec,library=True)
        source = source.replace('calloc(STOCK_JSON_MAX_RECORDS, sizeof(int32_t))','NULL')
        library = self.json_library(source,'alloc-failure')
        self.assertEqual(library.stock_json(target.encode(target.fixture())),105)

    def test_json_allocation_balance(self):
        import stock_json_fuzz as target
        source = generator.generate_json(self.spec,library=True)
        tracking = ('static int liveBlocks;\n'
                    'static void *trackedCalloc(size_t n,size_t s) { void *p=calloc(n,s); if(p)++liveBlocks; return p; }\n'
                    'static void trackedFree(void *p) { if(p)--liveBlocks; free(p); }\n'
                    'int stock_live_blocks(void) { return liveBlocks; }\n')
        source = source.replace('fixture.quantities = calloc(', 'fixture.quantities = trackedCalloc(')
        source = source.replace('free(fixture.quantities);','trackedFree(fixture.quantities);')
        source = source.replace('#define STOCK_JSON_MAX_BYTES',tracking+'#define STOCK_JSON_MAX_BYTES',1)
        library = self.json_library(source,'alloc-balance')
        library.stock_live_blocks.restype = ctypes.c_int
        for _, data, _ in target.golden_cases():
            library.stock_json(data)
            self.assertEqual(library.stock_live_blocks(),0)

    def test_json_excel_traceability(self):
        import stock_json_fuzz as target
        tables = target.spec_tables()
        self.assertEqual(len(tables),10)
        self.assertEqual(len(tables['TestCase'])-1,49)
        requirements = {row[0] for row in tables['YeuCauChucNang'][1:]}
        covered = {key.strip() for row in tables['TestCase'][1:] for key in row[1].split(',')}
        self.assertEqual(covered,requirements)
        self.assertEqual(len(tables['LoaiTruLanNhau']),2)

    def test_json_launcher_does_not_change_parent_path(self):
        import stock_json_fuzz as target
        before = os.environ.get('PATH','')
        with patch.object(target.subprocess,'Popen') as launch:
            self.assertEqual(target.open_lab(),0)
            environment = launch.call_args.kwargs['env']
            self.assertTrue(environment['PATH'].startswith(str(runner.OUTPUT/'toolchain/mingw64/bin')))
            self.assertEqual(os.environ.get('PATH',''),before)


if __name__ == '__main__':
    unittest.main(verbosity=2)
