"""
Conecta por SSH al VPS y corre el bootstrap, streameando la salida.
Uso:  python run-remote.py <host> <user> <password>
"""
import sys
import time
import paramiko

host = sys.argv[1]
user = sys.argv[2]
password = sys.argv[3]
cmd = sys.argv[4] if len(sys.argv) > 4 else (
    "curl -fsSL https://raw.githubusercontent.com/cacostama/WebSamap2/main/scripts/deploy/setup-vps.sh | bash"
)

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
print(f">>> conectando a {user}@{host} ...", flush=True)
client.connect(hostname=host, username=user, password=password, timeout=30, banner_timeout=30)
print(">>> conectado, ejecutando comando", flush=True)
print(f">>> $ {cmd}", flush=True)
print("=" * 70, flush=True)

transport = client.get_transport()
chan = transport.open_session()
chan.get_pty()
chan.exec_command(cmd)

start = time.time()
while True:
    if chan.recv_ready():
        data = chan.recv(8192)
        if data:
            sys.stdout.buffer.write(data)
            sys.stdout.flush()
    if chan.recv_stderr_ready():
        data = chan.recv_stderr(8192)
        if data:
            sys.stderr.buffer.write(data)
            sys.stderr.flush()
    if chan.exit_status_ready() and not chan.recv_ready() and not chan.recv_stderr_ready():
        break
    if time.time() - start > 1500:  # 25min hard timeout
        print("\n>>> timeout 25min", flush=True)
        break
    time.sleep(0.15)

exit_code = chan.recv_exit_status()
print("=" * 70, flush=True)
print(f">>> exit code: {exit_code}", flush=True)
client.close()
sys.exit(exit_code)
