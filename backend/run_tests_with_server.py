import subprocess
import time

print("Starting Uvicorn...")
server_log = open("uvicorn.log", "w")
server = subprocess.Popen(["uvicorn", "main:app", "--port", "8000"], stdout=server_log, stderr=server_log)
time.sleep(4) # Wait for server to start

try:
    print("Running tests...")
    subprocess.run(["python", "test_concurrency.py"])
finally:
    print("Terminating server...")
    server.terminate()
