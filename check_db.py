import paramiko

HOST = "155.117.46.218"; USER = "saturnin"; PASS = "Pluton@2015"
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=20)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    out = stdout.read().decode(errors="replace").strip()
    print(out)

run("mysql -u usra_v2 -pUsraV2@2026! usra_backoffice -e \"DESCRIBE Service;\" 2>/dev/null")
print("---")
run("mysql -u usra_v2 -pUsraV2@2026! usra_backoffice -e \"DESCRIBE InterviewTemplate;\" 2>/dev/null")
ssh.close()
