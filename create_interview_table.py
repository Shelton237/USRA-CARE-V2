import paramiko

HOST = "155.117.46.218"
USER = "saturnin"
PASS = "Pluton@2015"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=20)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    out = stdout.read().decode(errors="replace").strip()
    err = stderr.read().decode(errors="replace").strip()
    err = err.replace("mysql: [Warning] Using a password on the command line interface can be insecure.", "").strip()
    if out: print(out)
    if err: print("ERR:", err)

ddl = (
    "CREATE TABLE IF NOT EXISTS `InterviewTemplate` ("
    "`id` INT NOT NULL AUTO_INCREMENT,"
    "`name` VARCHAR(191) NOT NULL,"
    "`label` VARCHAR(191) NOT NULL,"
    "`sections` JSON NOT NULL,"
    "`createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),"
    "`updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),"
    "PRIMARY KEY (`id`),"
    "UNIQUE KEY `InterviewTemplate_name_key` (`name`)"
    ") DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;"
)

run("mysql -u usra_v2 -pUsraV2@2026! usra_backoffice -e \"" + ddl + "\"")

# Also add missing columns to Service if needed
run("mysql -u usra_v2 -pUsraV2@2026! usra_backoffice -e \"ALTER TABLE Service MODIFY COLUMN icon VARCHAR(50);\" 2>&1 | grep -v Warning || true")
run("mysql -u usra_v2 -pUsraV2@2026! usra_backoffice -e \"ALTER TABLE Service ADD COLUMN IF NOT EXISTS category VARCHAR(191);\" 2>&1 | grep -v Warning || true")
run("mysql -u usra_v2 -pUsraV2@2026! usra_backoffice -e \"ALTER TABLE Service ADD COLUMN IF NOT EXISTS description TEXT;\" 2>&1 | grep -v Warning || true")

run("mysql -u usra_v2 -pUsraV2@2026! usra_backoffice -e \"SHOW TABLES LIKE '%Interview%';\"")
print("DONE")
ssh.close()
