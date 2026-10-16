import importlib.util
import pathlib
import re
import threading
import unittest
import urllib.request

import serve

_spec = importlib.util.spec_from_file_location('check_headers', pathlib.Path(__file__).parent / 'tools' / 'check_headers.py')
ch = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ch)


class TestSecurityHeaders(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = serve.make_server(0)
        cls.port = cls.server.server_address[1]
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def get(self, path):
        return urllib.request.urlopen(f"http://127.0.0.1:{self.port}{path}")

    def test_headers_present(self):
        r = self.get("/")
        for name in ("Content-Security-Policy", "Referrer-Policy", "X-Content-Type-Options",
                     "X-Frame-Options", "Permissions-Policy", "Cross-Origin-Opener-Policy"):
            self.assertIsNotNone(r.headers.get(name), name)
        self.assertEqual(r.headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(r.headers["Referrer-Policy"], "no-referrer")

    def test_csp_is_strict_for_scripts(self):
        csp = self.get("/").headers["Content-Security-Policy"]
        tokens = re.search(r"script-src ([^;]*)", csp).group(1).split()
        self.assertEqual(sorted(tokens), ["'self'", "'wasm-unsafe-eval'"])  # no third-party script by default
        self.assertNotIn("'unsafe-inline'", tokens)
        self.assertNotIn("'unsafe-eval'", tokens)
        self.assertIn("object-src 'none'", csp)
        self.assertIn("frame-ancestors 'none'", csp)
        self.assertNotIn("accounts.google.com", csp)

    def test_no_third_party_sign_in_policy(self):
        csp = serve.build_csp()
        self.assertNotIn("accounts.google.com", csp)
        self.assertNotIn("facebook.com", csp)
        self.assertNotIn("'unsafe-inline'", re.search(r"script-src ([^;]*)", csp).group(1))

    def test_deployed_site_checker_passes_against_local_server(self):
        results = ch.check(f"http://127.0.0.1:{self.port}/")
        failed = [r for r in results if not r[1]]
        self.assertEqual(failed, [], failed)

    def test_deployed_site_checker_detects_weak_sites(self):
        weak = lambda url: ({"content-security-policy": "script-src 'self' 'unsafe-inline' https://cdn.example.com"}, "<script>x()</script><script src='https://evil.example/a.js'></script>", url)
        names = {n for n, ok, _ in ch.check("https://example.com/", fetcher=weak) if not ok}
        self.assertIn("script-src has no 'unsafe-inline' or 'unsafe-eval'", names)
        self.assertIn("X-Content-Type-Options: nosniff", names)
        self.assertTrue(any(n.startswith("page loads only same-origin") for n in names))

    def test_app_files_served(self):
        for path in ("/index.html", "/app.js", "/sw.js", "/manifest.webmanifest"):
            self.assertEqual(self.get(path).status, 200, path)

    def test_hosting_files_match_server_policy(self):
        for path in ("web/_headers", "hosting/nginx.conf"):
            with open(path, encoding="utf-8") as f:
                self.assertIn(serve.CSP, f.read(), path)

    def test_page_only_loads_own_scripts(self):
        html = self.get("/index.html").read().decode()
        for src in re.findall(r'<script[^>]*\bsrc="([^"]+)"', html):
            self.assertFalse(src.startswith("http"), src)
        self.assertNotIn("<script>", html)


if __name__ == "__main__":
    unittest.main()
