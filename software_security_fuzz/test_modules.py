"""Kiểm tra C sinh ra, oracle và golden case; không gọi website/database."""
import argparse
import copy
import json
import os
from pathlib import Path
import unittest
import uuid

import fuzz_runner
import module_oracles as oracle
import module_runner as runner

SELECTED = runner.MODULES


class ModuleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root = runner.OUTPUT / ('module-tests-' + uuid.uuid4().hex[:8])
        cls.root.mkdir(parents=True)
        cls.gcc = runner.OUTPUT / 'toolchain/mingw64/bin/gcc.exe'
        os.environ['PATH'] = str(cls.gcc.parent) + os.pathsep + os.environ.get('PATH', '')
        cls.specs, cls.targets = {}, {}
        for name in SELECTED:
            spec = runner.load_spec(name)
            cls.specs[name] = spec
            cls.targets[name] = cls.compile_spec(spec, name)

    @classmethod
    def compile_spec(cls, spec, label):
        directory = cls.root / label; directory.mkdir()
        source = directory / 'generated.c'
        source.write_text(runner.generate(spec), encoding='utf-8')
        binary = fuzz_runner.compile_target(directory, str(cls.gcc), source, label.replace('-', '_'))
        return binary, directory

    def test_golden_oracles(self):
        for name, spec in self.specs.items():
            for test in spec['cases']:
                with self.subTest(module=name, case=test['id']):
                    case = oracle.defaults(spec); case.update(test['input'])
                    actual = oracle.expected(spec, oracle.pack_case(spec, case))
                    self.assertEqual({k: actual[k] for k in test['expected']}, test['expected'])

    def test_c_regressions(self):
        for name, spec in self.specs.items():
            binary, directory = self.targets[name]
            self.assertEqual(runner.regressions(spec, binary, directory), len(spec['cases']) + 2)

    def test_generation_is_deterministic(self):
        for spec in self.specs.values():
            self.assertEqual(runner.generate(spec), runner.generate(copy.deepcopy(spec)))

    def test_backend_change_is_rejected(self):
        for name, spec in self.specs.items():
            changed = copy.deepcopy(spec)
            changed['backend_sha256'][next(iter(changed['backend_sha256']))] = '0' * 64
            path = self.root / (name + '-stale.json')
            path.write_text(json.dumps(changed), encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'đã đổi'):
                runner.load_spec(name, path)

    def test_reject_unsafe_expressions(self):
        for text in ('__import__("os")', 'a.__class__', 'unknown', 'a // 0', 'a // b', 'eval(a)'):
            with self.subTest(expression=text), self.assertRaises((ValueError, SyntaxError)):
                runner.translate(text, {'a', 'b'})

    def test_requirement_traceability(self):
        for spec in self.specs.values():
            requirements = {row[0] for row in spec['requirements']}
            self.assertEqual(requirements, {case['req'] for case in spec['cases']})

    def test_excel_projection(self):
        headers = fuzz_runner.spec_tables()
        for name, spec in self.specs.items():
            tables = runner.teacher_tables(name)
            self.assertEqual(set(tables), set(headers))
            for sheet, rows in tables.items():
                self.assertEqual(rows[0], headers[sheet][0])
                self.assertTrue(all(len(row) == len(rows[0]) for row in rows))
            self.assertEqual(len(tables['TestCase']) - 1, len(spec['cases']))

    def test_combined_excel(self):
        tables = runner.combined_tables()
        self.assertEqual(len(tables['TestCase']) - 1, 42)
        self.assertEqual(len(tables['YeuCauChucNang']) - 1, 24)
        for name in ('YeuCauChucNang', 'YeuCauPhiChucNang', 'RangBuoc', 'TestCase'):
            ids = [row[0] for row in tables[name][1:]]
            self.assertEqual(len(ids), len(set(ids)), name)
        states = tables['MoHinhTrangThai'][1:]
        names = {row[0] for row in states}
        self.assertEqual(sum(row[1] == 'x' for row in states), 1)
        for row in states:
            self.assertTrue(set(row[3].split(', ')) <= names)

    def test_invariant_rejects_negative_accepted_values(self):
        for spec in self.specs.values():
            data = oracle.pack_case(spec, oracle.defaults(spec))
            actual = {'code': 0, 'values': [-1] * len(spec['outputs']), 'target': 0}
            self.assertFalse(runner.valid_result(spec, data, actual))

    def test_spec_change_changes_c_behavior(self):
        for name, original in self.specs.items():
            changed, case = copy.deepcopy(original), oracle.defaults(original)
            if name == 'idempotency':
                changed['pending_limit'] = 1
                case.update(pending_1=1, request_count=1)
            else:
                field = 'total' if name == 'voucher' else 'points'
                changed['rules'].insert(0, {'when': f'{field} >= 0', 'return': 8})
            binary, directory = self.compile_spec(changed, name + '-changed')
            data = oracle.pack_case(changed, case)
            outcome, actual, _ = runner.execute(binary, data, directory, 0)
            self.assertEqual(outcome, 'ok')
            self.assertNotEqual(actual, oracle.expected(original, data))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--module', choices=['all'] + list(runner.MODULES), default='all')
    args, remaining = parser.parse_known_args()
    SELECTED = runner.MODULES if args.module == 'all' else (args.module,)
    unittest.main(argv=['test_modules.py'] + remaining, verbosity=2)
