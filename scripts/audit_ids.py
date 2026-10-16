import re
import os

with open("static/app.js", "r", encoding="utf-8") as f:
    text = f.read()

ids = set(re.findall(r"document\.getElementById\(['\"]([^'\"]+)['\"]\)", text))
print("Count of getElementById IDs in app.js:", len(ids))
for i in sorted(ids):
    print(" ", i)
