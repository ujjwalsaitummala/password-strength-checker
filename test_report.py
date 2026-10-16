import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location("security_report", pathlib.Path(__file__).parent / "tools" / "security_report.py")
sr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sr)


class TestReportTool(unittest.TestCase):
    def test_parsers(self):
        self.assertEqual(sr.parse_unittest("Ran 25 tests in 0.5s\n\nOK"), "25 tests")
        self.assertEqual(sr.parse_node("x\nbreach tests passed\n"), "breach tests passed")
        self.assertEqual(sr.checklist_counts("- [x] a\n- [ ] b\n- [X] c"), (2, 3))

    def test_findings_classification(self):
        rows = sr.parse_findings("| 1 | XSS handled | Mitigated, tested |\n| 3 | Token not verified | Open by design |\n| 2 | CSP | Done, needs your live test |\n")
        self.assertEqual(len(rows), 3)
        self.assertTrue(sr.is_resolved("Mitigated, tested"))
        self.assertTrue(sr.is_resolved("Fixed: cleared after 30 s"))
        self.assertFalse(sr.is_resolved("Open by design"))
        self.assertFalse(sr.is_resolved("Done, needs your live test"))

    def test_markdown_is_honest(self):
        md = sr.build_markdown([{"name": "A", "status": "PASS", "detail": "ok"}, {"name": "B", "status": "SKIPPED", "detail": "no deps"}],
                               [("1", "x", "Mitigated"), ("2", "y", "Open")], (1, 4), now="2026-01-01 00:00")
        self.assertIn("not a penetration test", md)
        self.assertIn("1 passed, 0 failed, 1 skipped", md)
        self.assertIn("were NOT run", md)
        self.assertIn("1 of 4", md)
        self.assertIn("no pentest findings", md)

    def test_real_security_md_parses(self):
        rows = sr.parse_findings((pathlib.Path(__file__).parent / "SECURITY.md").read_text(encoding="utf-8"))
        self.assertGreaterEqual(len(rows), 8)


if __name__ == "__main__":
    unittest.main()
