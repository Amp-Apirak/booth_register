#!/usr/bin/env python3
"""One-off codemod for the light theme (kept for reference / re-runs on new code).

In the dark design `text-white` means two things:
  1. primary ink on a dark surface  -> must flip to dark ink in light mode (kept as `text-white`)
  2. text on a solid accent/gradient button or dark overlay -> must stay white (`text-on-accent`)
This rewrites case 2 inside each string literal whose own classes include a strong background.

usage: python3 scripts/codemod-on-accent.py [--write] FILE...
"""
import re, sys

HUES = 'indigo|purple|violet|cyan|sky|blue|emerald|green|teal|rose|red|pink|fuchsia|amber|orange|yellow|lime'
# a strong background in the same literal (base state or with a variant prefix)
STRONG = re.compile(
    r'(?<![\w/-])(?P<prefix>(?:[a-z-]+:)*)(?:'
    rf'(?:bg|from|via|to)-(?:{HUES})-(?:500|600|700|800)(?:/(?:[5-9]\d|100))?'
    r'|bg-black/(?:[5-9]\d)'
    r'|holo-gradient'
    r')(?![\w/-])'  # a trailing /NN below 50 means a faint tint, not a strong background
)
TEXT_WHITE = re.compile(r'(?<![\w/:-])(?P<prefix>(?:[a-z-]+:)*)text-white(?![\w/-])')

def literals(src):
    """Yield (start, end) spans of '..', ".." and the static text of `..` literals."""
    i, n = 0, len(src)
    while i < n:
        c = src[i]
        if c in '\'"':
            j = i + 1
            while j < n and src[j] != c:
                if src[j] == '\\': j += 1
                if src[j] == '\n': break
                j += 1
            if j < n and src[j] == c:
                yield (i + 1, j)
            i = j + 1
        elif c == '`':
            j = i + 1; start = j; depth = 0
            while j < n:
                if src[j] == '\\': j += 2; continue
                if src[j] == '`' and depth == 0: break
                if src[j:j+2] == '${':
                    yield (start, j); depth += 1; j += 2
                    # skip the expression (nested literals are handled on a second pass of the expression text)
                    k = j; brace = 1
                    while k < n and brace:
                        if src[k] == '{': brace += 1
                        elif src[k] == '}': brace -= 1
                        k += 1
                    for s, e in literals(src[j:k-1]):
                        yield (j + s, j + e)
                    j = k; depth -= 1; start = j; continue
                j += 1
            yield (start, j)
            i = j + 1
        elif src.startswith('//', i):
            i = src.find('\n', i) if src.find('\n', i) != -1 else n
        elif src.startswith('/*', i):
            e = src.find('*/', i); i = n if e == -1 else e + 2
        else:
            i += 1

def rewrite(src):
    changes = []
    out = list(src)
    for s, e in sorted(set(literals(src)), reverse=True):
        text = src[s:e]
        if 'text-white' not in text:
            continue
        strong_prefixes = {m.group('prefix') for m in STRONG.finditer(text)}
        if not strong_prefixes:
            continue
        def sub(m):
            # base text-white follows a base strong bg; hover:text-white follows hover:bg-…, etc.
            return f"{m.group('prefix')}text-on-accent" if m.group('prefix') in strong_prefixes or (m.group('prefix') == '' and '' in strong_prefixes) else m.group(0)
        new = TEXT_WHITE.sub(sub, text)
        if new != text:
            changes.append((src.count('\n', 0, s) + 1, text.strip()[:110], new.strip()[:110]))
            out[s:e] = list(new)
    return ''.join(out), changes

if __name__ == '__main__':
    write = '--write' in sys.argv
    files = [a for a in sys.argv[1:] if a != '--write']
    total = 0
    for f in files:
        src = open(f, encoding='utf-8').read()
        new, changes = rewrite(src)
        for line, before, after in changes:
            print(f'{f}:{line}\n  - {before}\n  + {after}')
        total += len(changes)
        if write and new != src:
            open(f, 'w', encoding='utf-8').write(new)
    print(f'{total} literal(s) {"rewritten" if write else "would change"}')
