"""Check the security headers and script policy of a DEPLOYED site.

Usage: python tools/check_headers.py https://your-site/
Exit code 1 if any check fails. Run it against the real hosted URL; local tests only cover serve.py.
"""
import re
import sys
import urllib.parse
import urllib.request



def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "check-headers/1.0"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return {k.lower(): v for k, v in r.headers.items()}, r.read().decode("utf-8", "replace"), r.geturl()


def directive(csp, name):
    m = re.search(r"(?:^|;)\s*" + re.escape(name) + r"\s+([^;]*)", csp or "")
    return m.group(1).split() if m else None


def check(url, fetcher=fetch):
    headers, body, final = fetcher(url)
    out = []

    def add(name, ok, detail=""):
        out.append((name, bool(ok), detail))

    csp = headers.get("content-security-policy", "")
    add("Content-Security-Policy present", bool(csp))
    script = directive(csp, "script-src") or []
    allowed = {"'self'", "'wasm-unsafe-eval'"}
    extra = [t for t in script if t not in allowed]
    add("script-src allows only this site", script and not extra, "unexpected: " + " ".join(extra) if extra else "")
    add("script-src has no 'unsafe-inline' or 'unsafe-eval'", "'unsafe-inline'" not in script and "'unsafe-eval'" not in script)
    add("object-src 'none'", directive(csp, "object-src") == ["'none'"])
    add("base-uri restricted", directive(csp, "base-uri") in (["'none'"], ["'self'"]))
    add("frame-ancestors 'none' or 'self'", directive(csp, "frame-ancestors") in (["'none'"], ["'self'"]) or headers.get("x-frame-options", "").upper() in ("DENY", "SAMEORIGIN"))
    add("Referrer-Policy set", headers.get("referrer-policy", "") not in ("", "unsafe-url"))
    add("X-Content-Type-Options: nosniff", "nosniff" in headers.get("x-content-type-options", "").lower())
    add("Permissions-Policy set", bool(headers.get("permissions-policy")))
    if urllib.parse.urlparse(final).scheme == "https":
        m = re.search(r"max-age=(\d+)", headers.get("strict-transport-security", ""))
        add("HSTS max-age at least 6 months", m and int(m.group(1)) >= 15552000)
    else:
        add("HSTS (skipped: not https)", True, "only checked on https")
    host = urllib.parse.urlparse(final).netloc
    bad = []
    for m in re.finditer(r"<script\b([^>]*)>", body, re.I):
        attrs = m.group(1)
        src = re.search(r'src="([^"]+)"', attrs)
        if not src:
            bad.append("inline script")
        else:
            u = urllib.parse.urlparse(urllib.parse.urljoin(final, src.group(1)))
            if u.netloc != host:
                bad.append(src.group(1))
    add("page loads only same-origin scripts", not bad, ", ".join(bad))
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        print(__doc__)
        sys.exit(2)
    try:
        results = check(args[0])
    except Exception as e:  # network errors, bad URL
        print("Could not fetch", args[0], "-", e)
        sys.exit(2)
    for name, ok, detail in results:
        print(("PASS  " if ok else "FAIL  ") + name + (f" ({detail})" if detail else ""))
    sys.exit(0 if all(ok for _, ok, _ in results) else 1)


if __name__ == "__main__":
    main()
