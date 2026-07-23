import paramiko
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

HOST   = "155.117.46.218"
USER   = "saturnin"
PASS   = "Pluton@2015"
REMOTE = "/var/www/usra-care-v2"
LOCAL  = r"c:\Users\TOUTENUN\Desktop\dev\eureka\usra-backoffice-app"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=20)

# 1. Upload new schema.prisma
print("=== Uploading schema.prisma ===")
sftp = ssh.open_sftp()
sftp.put(os.path.join(LOCAL, "prisma", "schema.prisma"), f"{REMOTE}/prisma/schema.prisma")
sftp.close()
print("Upload done.")

def run(cmd, label=""):
    print(f"\n>>> {label or cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=300, get_pty=False)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    er  = stderr.read().decode("utf-8", errors="replace").strip()
    combined = (out + "\n" + er).strip()
    print(combined.encode("ascii", errors="replace").decode("ascii")[:2000])
    return combined

# 2. Db push to alter table column sizes
print("\n=== Altering DB columns via prisma db push ===")
run(f"cd {REMOTE} && NO_COLOR=1 npx prisma db push --accept-data-loss 2>&1", "prisma db push")

# 3. Update Madagascar data in DB
print("\n=== Updating Madagascar Country Data ===")
query = (
    "UPDATE Country SET "
    "bankName = 'AFG Bank Madagascar', "
    "agencyCode = 'AFGB MADA ANDRANOMENA', "
    "bankCode = '00017', "
    "bankAccount = '00013559801', "
    "ribKey = '68', "
    "bic = 'AFGMMGMG', "
    "iban = 'MG4600017010050001355980168' "
    "WHERE code = 'MG';"
)
run(f"mysql -u usra_v2 -pUsraV2@2026! usra_backoffice -e \"{query}\" 2>&1", "MySQL Update Madagascar")

# 4. Verify updated data
print("\n=== Verifying Updated Madagascar Country Data ===")
run("mysql -u usra_v2 -pUsraV2@2026! usra_backoffice -e \"SELECT bankName, agencyCode, bankCode, bankAccount, ribKey, bic, iban FROM Country WHERE code='MG';\"")

# 5. Build Next.js
print("\n=== Rebuilding Next.js ===")
run(f"cd {REMOTE} && npm run build", "Build app")

# 6. Restart PM2
print("\n=== Restarting PM2 ===")
run("pm2 restart usra-care-v2", "PM2 Restart")

ssh.close()
print("\nDone!")
