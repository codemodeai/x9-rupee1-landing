"""Local dev server for the landing page.

Mirrors the two Vercel behaviours that would otherwise only show up in
production:

  1. Clean URLs — /success serves success.html (vercel.json "cleanUrls": true).
  2. Security headers — read straight out of vercel.json, so the CSP you test
     locally is the CSP that ships. Cache-Control is deliberately NOT copied:
     locally everything is no-store so edits always appear on refresh.

Plain `python -m http.server` does neither, which is how a broken CSP or a bad
link reaches production unnoticed.
"""
import json
import re
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def load_vercel_headers():
    """Return [(compiled_source_regex, {header: value}), ...] from vercel.json.

    Only handles the simple regex-compatible `source` patterns this project
    uses (e.g. "/(.*)"). It is a dev aid, not a Vercel router.
    """
    config = ROOT / "vercel.json"
    if not config.is_file():
        return []
    try:
        data = json.loads(config.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as err:
        print(f"  ! could not read vercel.json ({err}) — serving without its headers")
        return []

    rules = []
    for entry in data.get("headers", []):
        source = entry.get("source", "")
        try:
            pattern = re.compile("^" + source + "$")
        except re.error:
            continue
        values = {
            h["key"]: h["value"]
            for h in entry.get("headers", [])
            # Local dev must never cache; see module docstring.
            if h.get("key", "").lower() != "cache-control"
        }
        if values:
            rules.append((pattern, values))
    return rules


HEADER_RULES = load_vercel_headers()


class DevHandler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def send_head(self):
        self._apply_clean_url()
        return super().send_head()

    def _apply_clean_url(self):
        """/success -> /success.html, matching Vercel's cleanUrls."""
        path, sep, rest = self.path.partition("?")
        if path.endswith("/") or "." in path.rsplit("/", 1)[-1]:
            return
        candidate = ROOT / (path.lstrip("/") + ".html")
        if candidate.is_file():
            self.path = path + ".html" + sep + rest

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        request_path = self.path.partition("?")[0]
        for pattern, values in HEADER_RULES:
            if pattern.match(request_path):
                for key, value in values.items():
                    self.send_header(key, value)
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    handler = partial(DevHandler, directory=str(ROOT))
    with ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print(f"serving  {ROOT}")
        print(f"url      http://localhost:{port}/   (no-cache, clean URLs)")
        print(f"headers  {len(HEADER_RULES)} rule(s) from vercel.json")
        print("stop     Ctrl+C")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nstopped")


if __name__ == "__main__":
    main()
