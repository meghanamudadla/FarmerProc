import sys
with open("error.txt", "r", encoding="utf-16le") as f:
    sys.stdout.write(f.read())
