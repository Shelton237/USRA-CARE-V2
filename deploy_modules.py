#!/usr/bin/env python3
"""Deploy new modules to production server via SFTP + SSH."""
import paramiko, os, sys

HOST   = "155.117.46.218"
USER   = "saturnin"
PASS   = "Pluton@2015"
REMOTE = "/var/www/usra-care-v2"
LOCAL  = os.path.dirname(os.path.abspath(__file__))

FILES = [
    # Dashboard (wiring all new pages)
    "src/app/(app)/dashboard/page.tsx",

    # New page components
    "src/components/pages/ClientsPage.tsx",
    "src/components/pages/ServicesPage.tsx",
    "src/components/pages/CashPage.tsx",
    "src/components/pages/PaymentsPage.tsx",
    "src/components/pages/EvaluationsPage.tsx",
    "src/components/pages/ComplaintsPage.tsx",
    "src/components/pages/EquipmentPage.tsx",
    "src/components/pages/OvertimePage.tsx",
    "src/components/pages/AdvancesPage.tsx",
    "src/components/pages/AttendancePage.tsx",

    # Modified pages from previous session
    "src/components/pages/TargetsPage.tsx",

    # API routes — new
    "src/app/api/clients/[id]/route.ts",
    "src/app/api/services/route.ts",
    "src/app/api/services/[id]/route.ts",
    "src/app/api/cash/route.ts",
    "src/app/api/cash/[id]/route.ts",
    "src/app/api/payments/route.ts",
    "src/app/api/evaluations/route.ts",
    "src/app/api/evaluations/[id]/route.ts",
    "src/app/api/complaints/route.ts",
    "src/app/api/complaints/[id]/route.ts",
    "src/app/api/equipment/route.ts",
    "src/app/api/equipment/[id]/route.ts",
    "src/app/api/overtime/route.ts",
    "src/app/api/overtime/[id]/route.ts",
    "src/app/api/advances/route.ts",
    "src/app/api/advances/[id]/route.ts",
    "src/app/api/attendance/route.ts",
    "src/app/api/attendance/[id]/route.ts",

    # Modified API route from previous session
    "src/app/api/targets/[id]/route.ts",
]

def ssh_exec(client, cmd):
    print(f"  $ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print("   ", out[:600])
    if err and "warn" not in err.lower() and "npm warn" not in err.lower():
        print("  ERR:", err[:400])
    return out

def ensure_remote_dir(sftp, rpath):
    parts = rpath.split("/")
    cur = ""
    for p in parts:
        if not p: continue
        cur = cur + "/" + p
        try:
            sftp.stat(cur)
        except FileNotFoundError:
            sftp.mkdir(cur)
            print(f"  mkdir {cur}")

def main():
    print("=" * 60)
    print("  USRA-CARE V2 — Deploy new modules")
    print("=" * 60)

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"\nConnecting to {HOST}...")
    ssh.connect(HOST, username=USER, password=PASS, timeout=20)
    print("  Connected.\n")

    sftp = ssh.open_sftp()

    ok = 0; fail = 0
    for rel in FILES:
        local_path  = os.path.join(LOCAL, rel.replace("/", os.sep))
        remote_path = f"{REMOTE}/{rel}"

        if not os.path.exists(local_path):
            print(f"  [SKIP] {rel}  (not found locally)")
            fail += 1
            continue

        remote_dir = remote_path.rsplit("/", 1)[0]
        ensure_remote_dir(sftp, remote_dir)

        try:
            sftp.put(local_path, remote_path)
            print(f"  [OK]   {rel}")
            ok += 1
        except Exception as e:
            print(f"  [FAIL] {rel}: {e}")
            fail += 1

    sftp.close()

    print(f"\n{'─'*60}")
    print(f"  Uploaded: {ok}  /  Failed: {fail}")
    print(f"{'─'*60}\n")

    print("Building on server (this takes ~60–90s)...")
    cmd = f"cd {REMOTE} && npm run build 2>&1 | tail -30"
    ssh_exec(ssh, cmd)

    print("\nRestarting PM2...")
    ssh_exec(ssh, "pm2 restart usra-care-v2")

    print("\nWaiting 4s for startup...")
    import time; time.sleep(4)

    print("\nHealth check...")
    ssh_exec(ssh, "curl -s -o /dev/null -w 'HTTP %{http_code}' http://localhost:3001/v2/")

    ssh.close()
    print("\n✅  Done! https://usra-care.com/v2")

if __name__ == "__main__":
    main()
