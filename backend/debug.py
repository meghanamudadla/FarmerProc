import traceback
import sys

try:
    import test_dqa
    print("test_dqa imported successfully!")
except Exception as e:
    with open("debug_out.txt", "w", encoding="utf-8") as f:
        traceback.print_exc(file=f)
    print("Error written to debug_out.txt")
