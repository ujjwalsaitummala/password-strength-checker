import ast
import math
import pathlib
import unittest

import password_checker as pc

SRC = pathlib.Path(pc.__file__)


def kinds(r):
    return {f.kind for f in r.findings}


class TestScoring(unittest.TestCase):
    def test_weak(self):
        for pw in ["123456", "password", "qwerty", "aaaaaa", "abc123"]:
            self.assertIn(pc.evaluate(pw).rating, ("Very Weak", "Weak"), pw)

    def test_moderate(self):
        r = pc.evaluate("Tr7mQ2xLp")
        self.assertIn(r.rating, ("Moderate", "Strong"))

    def test_robust(self):
        for pw in ["k9#Vr2$Lq8!zXw4@Tn6", "correct-Horse-9-Battery-Staple!"]:
            self.assertIn(pc.evaluate(pw).rating, ("Strong", "Very Strong"), pw)

    def test_ordering(self):
        a = pc.evaluate("password").score
        b = pc.evaluate("Tr7mQ2xLp").score
        c = pc.evaluate("k9#Vr2$Lq8!zXw4@Tn6").score
        self.assertLess(a, b)
        self.assertLess(b, c)

    def test_empty(self):
        self.assertEqual(pc.evaluate("").score, 0)


class TestPatterns(unittest.TestCase):
    def test_leet_substitution(self):
        r = pc.evaluate("p@ssword")
        self.assertTrue(r.rating in ("Very Weak", "Weak"))
        self.assertIn("common", kinds(r))
        r2 = pc.evaluate("Dr@gon!!Xk")
        self.assertTrue(any(f.note == "uses character substitutions" for f in r2.findings))

    def test_sequences(self):
        for pw in ["xx123456xx", "Zqwertyuz9", "abcdefgh", "9876543"]:
            self.assertIn("sequence", kinds(pc.evaluate(pw)), pw)

    def test_repeats(self):
        self.assertIn("repeat", kinds(pc.evaluate("Kaaaa7!m")))
        self.assertIn("repeat", kinds(pc.evaluate("Xyabababq")))

    def test_dictionary(self):
        self.assertIn("dictionary", kinds(pc.evaluate("MySunshine77")))

    def test_year(self):
        self.assertIn("year", kinds(pc.evaluate("Rk!x1998zq")))

    def test_custom_wordlist(self):
        r = pc.evaluate("zebrafish", extra_words=["zebrafish"])
        self.assertIn("dictionary", kinds(r))


class TestEntropy(unittest.TestCase):
    def test_shannon(self):
        self.assertEqual(pc.shannon_entropy("aaaa"), 0.0)
        self.assertAlmostEqual(pc.shannon_entropy("abcd"), 2.0)

    def test_pool(self):
        self.assertEqual(pc.pool_size("abc"), 26)
        self.assertEqual(pc.pool_size("aB3!"), 26 + 26 + 10 + 33)

    def test_pool_bits(self):
        r = pc.evaluate("aB3!xY9?")
        self.assertAlmostEqual(r.pool_bits, 8 * math.log2(95))


class TestFeedback(unittest.TestCase):
    def test_suggestions_actionable(self):
        tips = " ".join(pc.evaluate("password1").suggestions)
        self.assertIn("12 characters", tips)
        self.assertIn("uppercase", tips)
        self.assertIn("special", tips)

    def test_strong_gets_positive_feedback(self):
        r = pc.evaluate("k9#Vr2$Lq8!zXw4@Tn6")
        self.assertTrue(any("Looks good" in t for t in r.suggestions))


class TestSharedVectors(unittest.TestCase):
    """Same vectors are checked against the web analyzer by tests/analyzer.test.mjs."""
    def test_vectors(self):
        import json
        vs = json.loads((pathlib.Path(pc.__file__).parent / "shared" / "test_vectors.json").read_text())
        for v in vs:
            r = pc.evaluate(v["pw"])
            self.assertEqual(r.rating, v["rating"], v["pw"])
            self.assertEqual(sorted({f.kind for f in r.findings}), v["kinds"], v["pw"])
            self.assertAlmostEqual(r.effective_bits, v["bits"], places=4, msg=v["pw"])


class TestPrivacy(unittest.TestCase):
    """Static checks backing the zero-storage / zero-transmission guarantee."""
    FORBIDDEN = {"socket", "http", "urllib", "requests", "logging", "sqlite3",
                 "pickle", "shelve", "smtplib", "ftplib", "subprocess", "tempfile"}

    def setUp(self):
        self.tree = ast.parse(SRC.read_text())

    def test_no_network_or_persistence_imports(self):
        for node in ast.walk(self.tree):
            if isinstance(node, ast.Import):
                names = [a.name.split(".")[0] for a in node.names]
            elif isinstance(node, ast.ImportFrom):
                names = [(node.module or "").split(".")[0]]
            else:
                continue
            self.assertFalse(set(names) & self.FORBIDDEN, names)

    def test_no_write_mode_files_or_print_of_password(self):
        for node in ast.walk(self.tree):
            if isinstance(node, ast.Call) and getattr(node.func, "id", "") == "open":
                modes = [a.value for a in node.args[1:2] if isinstance(a, ast.Constant)]
                for m in modes:
                    self.assertNotRegex(m, r"[wax+]")

    def test_result_does_not_contain_password(self):
        pw = "UniqueSecret#917xq"
        r = pc.evaluate(pw)
        self.assertNotIn(pw, repr(r.__dict__.get("suggestions")))
        self.assertNotIn(pw, pc.format_report(r))


if __name__ == "__main__":
    unittest.main()
