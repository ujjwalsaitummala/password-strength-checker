"""Local web server for web/ that sends production security headers.

Usage:  python serve.py [port]   (default 8000, then open http://localhost:8000/)
        This local-first release does not enable third-party sign-in.
Trial the policy without enforcing it:  CSP_REPORT_ONLY=1 python serve.py
The same policy is in web/_headers (Netlify, Cloudflare Pages) and hosting/nginx.conf.
"""
import http.server
import os
import pathlib
import sys

WEB = pathlib.Path(__file__).parent / "web"
def build_csp():
    """Strict same-origin policy. No third-party sign-in scripts are supported."""
    return ("default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.pwnedpasswords.com; "
            "img-src 'self' data:; manifest-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; "
            "form-action 'none'; frame-ancestors 'none'")


CSP = build_csp()
HEADERS = {
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Cross-Origin-Opener-Policy": "same-origin",
}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB), **kwargs)

    def copyfile(self, source, outputfile):
        # Browsers and test clients may cancel large requests during teardown.
        # Treat a closed client socket as a normal disconnect, not a server error.
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def end_headers(self):
        name = "Content-Security-Policy-Report-Only" if os.environ.get("CSP_REPORT_ONLY") else "Content-Security-Policy"
        self.send_header(name, CSP)
        for key, value in HEADERS.items():
            self.send_header(key, value)
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


def make_server(port=0):
    return http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    port = int(args[0]) if args else 8000
    server = make_server(port)
    mode = "report-only" if os.environ.get("CSP_REPORT_ONLY") else "enforced"
    print(f"Serving web/ at http://localhost:{port}/  (CSP {mode}, no third-party sign-in). Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
