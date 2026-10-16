"""Run every automated test suite and write SECURITY_REPORT.md.

Usage:  python tools/security_report.py [output.md]
The browser-journey suite runs if tests/ui/node_modules/jsdom exists, or if UI_TEST_DIR points to a
folder where `npm install jsdom fake-indexeddb` was done. Exit code is 1 if any suite fails.

This report shows AUTOMATED TEST RESULTS only. It is not a penetration test or an independent audit.
"""
import datetime
import os
import pathlib
import platform
import re
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


def run(cmd, cwd=ROOT, env=None, timeout=420):
    try:
        p = subprocess.run(cmd, cwd=cwd, env=env, capture_output=True, text=True, timeout=timeout)
        return p.returncode, p.stdout + p.stderr
    except FileNotFoundError:
        return None, "command not found"
    except subprocess.TimeoutExpired:
        return None, "timed out"


def last_line(text):
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    return lines[-1] if lines else ""


def parse_unittest(text):
    m = re.search(r"Ran (\d+) tests?", text)
    return f"{m.group(1)} tests" if m else last_line(text)


def parse_node(text):
    for line in text.splitlines():
        if "passed" in line:
            return line.strip()
    return last_line(text)


def collect_results():
    results = []
    code, out = run([sys.executable, "-m", "unittest"])
    results.append({"name": "Python tests (analyzer, privacy rules, security headers, report tool)",
                    "status": "PASS" if code == 0 else "FAIL", "detail": parse_unittest(out)})
    node = shutil.which("node")
    suites = [("Analyzer parity: web vs Python on shared vectors", "analyzer"), ("Vault encryption round trip", "vault_crypto"),
              ("Breach-check hashing and parsing", "breach"), ("Passphrase word list", "passphrase"),
              ("Static security checks (XSS patterns, inline scripts, hosts)", "security"), ("Link-check (phishing heuristics) cases", "phish"),
              ("Argon2id known-answer vectors (vendored libsodium)", "argon2"), ("Vendored library integrity", "vendor")]
    for name, f in suites:
        if not node:
            results.append({"name": name, "status": "SKIPPED", "detail": "Node.js not installed"})
            continue
        code, out = run([node, f"tests/{f}.test.mjs"])
        results.append({"name": name, "status": "PASS" if code == 0 else "FAIL", "detail": parse_node(out) if code == 0 else last_line(out)})
    ui_dir = None
    if (ROOT / "tests/ui/node_modules/jsdom/package.json").exists():
        ui_dir = ROOT / "tests/ui"
    elif os.environ.get("UI_TEST_DIR") and (pathlib.Path(os.environ["UI_TEST_DIR"]) / "node_modules/jsdom").exists():
        ui_dir = pathlib.Path(os.environ["UI_TEST_DIR"])
    for name, extra in (("Browser-journey tests (jsdom, real WebCrypto, Argon2id)", {}), ("Browser-journey tests without Argon2id (PBKDF2 fallback)", {"NO_ARGON": "1"})):
        if not node or not ui_dir:
            results.append({"name": name, "status": "SKIPPED", "detail": "dependencies not installed; run `npm run test:ui`"})
            continue
        env = dict(os.environ, WEB_DIR=str(ROOT / "web"), **extra)
        source = ROOT / "tests/ui/journey.test.mjs"
        destination = ui_dir / "journey.test.mjs"
        if source.resolve() != destination.resolve():
            shutil.copy2(source, destination)
        code, out = run([node, "journey.test.mjs"], cwd=ui_dir, env=env)
        results.append({"name": name, "status": "PASS" if code == 0 else "FAIL", "detail": parse_node(out) if code == 0 else last_line(out)})
    return results


def parse_findings(text):
    rows = []
    for line in text.splitlines():
        m = re.match(r"^\|\s*(\d+)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*$", line)
        if m:
            rows.append((m.group(1), m.group(2), m.group(3)))
    return rows


def is_resolved(status):
    return bool(re.match(r"(Mitigated|Fixed|Done)", status, re.I)) and not re.search(r"needs|not yet|partly", status, re.I)


def checklist_counts(text):
    # Automated test boxes are reported in the test table, not as manual verification.
    if "## Setup and hosting" in text:
        text = text.split("## Setup and hosting", 1)[1]
    return len(re.findall(r"- \[x\]", text, re.I)), len(re.findall(r"- \[[ xX]\]", text))


def build_markdown(results, findings, manual, now=None):
    now = now or datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    failed = [r for r in results if r["status"] == "FAIL"]
    skipped = [r for r in results if r["status"] == "SKIPPED"]
    L = ["# Security regression report", "", f"Generated: {now} | Python {platform.python_version()} on {platform.system()}", "",
         "This report lists **automated test results**. It is not a penetration test and not an independent audit.", "",
         "## Automated test results", "", "| Suite | Result | Detail |", "|---|---|---|"]
    for r in results:
        L.append(f"| {r['name']} | {r['status']} | {r['detail']} |")
    L += ["", f"Summary: {sum(r['status'] == 'PASS' for r in results)} passed, {len(failed)} failed, {len(skipped)} skipped.", ""]
    if failed:
        L += ["**Failures need fixing before release.**", ""]
    if skipped:
        L += ["Skipped suites were NOT run, so their areas are unverified in this report.", ""]
    res = [f for f in findings if is_resolved(f[2])]
    opn = [f for f in findings if not is_resolved(f[2])]
    L += ["## Security findings (from SECURITY.md)", "", "### Mitigated or fixed", ""]
    L += [f"- #{i} {t[:140]} ({s[:60]})" for i, t, s in res] or ["- none"]
    L += ["", "### Open, accepted or needing your verification", ""]
    L += [f"- #{i} {t[:140]} ({s[:80]})" for i, t, s in opn] or ["- none"]
    done, total = manual
    L += ["", "## Manual and deployment verification (not covered by automated tests)", "",
          f"Release checklist items confirmed: {done} of {total}. Unticked items are unverified.", "",
          "## What this report does not cover", "",
          "- Penetration testing or attacks by a human tester (no pentest findings are included).",
          "- Testing in real Chrome and Firefox, and on real phones.",
          "- Backend authentication and synchronization (not part of this local-first app).",
          "- The hosting environment and external breach-check API."]
    return "\n".join(L) + "\n"


def main():
    out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "SECURITY_REPORT.md"
    results = collect_results()
    findings = parse_findings((ROOT / "SECURITY.md").read_text(encoding="utf-8"))
    manual = checklist_counts((ROOT / "RELEASE_CHECKLIST.md").read_text(encoding="utf-8"))
    out.write_text(build_markdown(results, findings, manual), encoding="utf-8")
    print(f"Wrote {out}")
    for r in results:
        print(f"  {r['status']:8} {r['name']}")
    sys.exit(1 if any(r["status"] == "FAIL" for r in results) else 0)


if __name__ == "__main__":
    main()
