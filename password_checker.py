"""Local password strength checker.

Privacy: passwords are handled only as in-memory strings. This module never
writes, logs, or transmits them (no network, logging, or persistence imports).
"""
import math
import re
import sys
from collections import Counter
from dataclasses import dataclass, field

import json
import pathlib

# Shared with the web app (web/index.html embeds the same rules; tests keep them in sync).
_RULES = json.loads((pathlib.Path(__file__).parent / "shared" / "rules.json").read_text(encoding="utf-8"))
COMMON_PASSWORDS = set(_RULES["common_passwords"])
COMMON_WORDS = set(_RULES["common_words"])
LEET = str.maketrans(_RULES["leet"])
SEQUENCES = list(_RULES["sequences"])
SEQUENCES += [s[::-1] for s in SEQUENCES]
COST = dict(_RULES["costs"])  # estimated attacker cost (bits) per pattern kind
MIN_WORD = _RULES["min_word"]


@dataclass
class Finding:
    kind: str
    text: str
    start: int
    end: int
    note: str = ""


@dataclass
class Result:
    length: int
    pool_size: int
    shannon_bits: float
    pool_bits: float
    effective_bits: float
    score: int
    rating: str
    findings: list = field(default_factory=list)
    suggestions: list = field(default_factory=list)


def pool_size(pw):
    size = 0
    if re.search(r"[a-z]", pw): size += 26
    if re.search(r"[A-Z]", pw): size += 26
    if re.search(r"\d", pw): size += 10
    if re.search(r"[^A-Za-z0-9]", pw): size += 33
    return size


def shannon_entropy(pw):
    """Per-character Shannon entropy H = -sum(p*log2 p), in bits."""
    if not pw:
        return 0.0
    n = len(pw)
    return -sum((c / n) * math.log2(c / n) for c in Counter(pw).values())


def _find_dictionary(pw, words):
    out, low = [], pw.lower()
    norm = low.translate(LEET)
    for i in range(len(pw)):
        for j in range(len(pw), i + MIN_WORD - 1, -1):
            if norm[i:j] in words:
                note = "uses character substitutions" if low[i:j] != norm[i:j] else ""
                out.append(Finding("dictionary", pw[i:j], i, j, note))
                break
    return out


def _find_sequences(pw):
    out, low, i = [], pw.lower(), 0
    while i < len(low) - 2:
        best = 0
        for seq in SEQUENCES:
            k = seq.find(low[i:i + 3])
            if k != -1:
                j = i + 3
                while j < len(low) and k + (j - i) < len(seq) and seq[k + (j - i)] == low[j]:
                    j += 1
                best = max(best, j - i)
        if best >= 3:
            out.append(Finding("sequence", pw[i:i + best], i, i + best))
            i += best
        else:
            i += 1
    return out


def _find_repeats(pw):
    out = []
    for m in re.finditer(r"(.)\1{2,}", pw):
        out.append(Finding("repeat", m.group(), m.start(), m.end(), "repeated character"))
    for m in re.finditer(r"(.{2,4}?)\1+", pw):
        out.append(Finding("repeat", m.group(), m.start(), m.end(), "repeated block"))
    for m in re.finditer(r"(?<!\d)(19|20)\d{2}(?!\d)", pw):
        out.append(Finding("year", m.group(), m.start(), m.end(), "looks like a year"))
    return out


def _select(findings, n):
    """Greedy non-overlapping selection, longest pattern first."""
    covered, chosen = [False] * n, []
    for f in sorted(findings, key=lambda f: f.start - f.end):
        if not any(covered[f.start:f.end]):
            chosen.append(f)
            for k in range(f.start, f.end):
                covered[k] = True
    return sorted(chosen, key=lambda f: f.start), covered


def evaluate(password, extra_words=None):
    """Evaluate a password entirely in memory. Nothing is stored or sent."""
    pw = password
    n = len(pw)
    if n == 0:
        return Result(0, 0, 0.0, 0.0, 0.0, 0, "Very Weak", [],
                      ["Enter a password to evaluate."])
    words = COMMON_WORDS | COMMON_PASSWORDS | {w.lower() for w in (extra_words or [])}
    pool = pool_size(pw)
    per_char = math.log2(pool)
    found = _find_dictionary(pw, words) + _find_sequences(pw) + _find_repeats(pw)
    chosen, covered = _select(found, n)

    bits = sum(COST[f.kind] for f in chosen) + covered.count(False) * per_char
    if pw.lower() in COMMON_PASSWORDS or pw.lower().translate(LEET) in COMMON_PASSWORDS:
        bits = min(bits, 10.0)
        chosen.insert(0, Finding("common", pw, 0, n, "among the most common passwords"))

    score = int(max(0, min(100, bits)))
    if bits < 28: rating = "Very Weak"
    elif bits < 36: rating = "Weak"
    elif bits < 60: rating = "Moderate"
    elif bits < 80: rating = "Strong"
    else: rating = "Very Strong"
    if n < 8 and rating not in ("Very Weak", "Weak"):
        rating = "Weak"

    return Result(n, pool, shannon_entropy(pw) * n, n * per_char, bits, score,
                  rating, chosen, _suggest(pw, chosen))


def _suggest(pw, findings):
    tips, kinds = [], {f.kind for f in findings}
    if len(pw) < 12:
        tips.append("Use at least 12 characters; length helps more than complexity.")
    for label, rx in (("lowercase letters", r"[a-z]"), ("uppercase letters", r"[A-Z]"),
                      ("numbers", r"\d"), ("special characters", r"[^A-Za-z0-9]")):
        if not re.search(rx, pw):
            tips.append(f"Add {label}.")
    if kinds & {"common", "dictionary"}:
        tips.append("Avoid dictionary words and common passwords.")
    if any(f.note == "uses character substitutions" for f in findings):
        tips.append("Swaps like '@' for 'a' or '0' for 'o' are well known to attackers.")
    if "sequence" in kinds:
        tips.append("Avoid sequences like '123456', 'abcd', or 'qwerty'.")
    if "repeat" in kinds:
        tips.append("Avoid repeated characters or blocks (e.g. 'aaa', 'abab').")
    if "year" in kinds:
        tips.append("Avoid years and dates; they are easy to guess.")
    if shannon_entropy(pw) < 2.5 and len(pw) >= 8:
        tips.append("Use more distinct characters; yours repeat a lot.")
    if not tips:
        tips.append("Looks good. Store it in a password manager and never reuse it.")
    else:
        tips.append("Try a random passphrase of 4+ unrelated words.")
    return tips


def format_report(r):
    lines = [f"Rating: {r.rating} (score {r.score}/100)",
             f"Length: {r.length} | Character pool: {r.pool_size}",
             f"Shannon entropy: {r.shannon_bits:.1f} bits | Pool entropy: {r.pool_bits:.1f} bits",
             f"Effective entropy (after pattern penalties): {r.effective_bits:.1f} bits"]
    if r.findings:
        lines.append("Weaknesses found:")
        for f in r.findings:
            extra = f" ({f.note})" if f.note else ""
            lines.append(f"  - {f.kind}{extra}")
    lines.append("Suggestions:")
    lines += [f"  * {t}" for t in r.suggestions]
    return "\n".join(lines)


def main(argv=None):
    """CLI. The password is read via getpass (never from argv or a file)."""
    import getpass
    extra = None
    argv = sys.argv[1:] if argv is None else argv
    if argv:
        with open(argv[0], encoding="utf-8") as fh:  # optional wordlist, read-only
            extra = [line.strip() for line in fh if line.strip()]
    pw = getpass.getpass("Password to check (hidden): ")
    print(format_report(evaluate(pw, extra)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
