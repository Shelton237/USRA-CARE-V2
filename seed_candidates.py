import paramiko, json

HOST = "155.117.46.218"; USER = "saturnin"; PASS = "Pluton@2015"
DB   = "usra_backoffice"; DU = "usra_v2"; DP = "UsraV2@2026!"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=20)

def q(sql):
    cmd = f"mysql -u {DU} -p{DP} {DB} -e \"{sql}\" 2>/dev/null"
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
    out = stdout.read().decode(errors="replace").strip()
    if out: print(out)

# Get country id (Madagascar = 1) and service ids
def fetch(sql):
    cmd = f"mysql -u {DU} -p{DP} {DB} -e \"{sql}\" 2>/dev/null"
    stdin, stdout, _ = ssh.exec_command(cmd, timeout=10)
    return stdout.read().decode(errors="replace").strip()

svcs = fetch("SELECT id, name FROM Service LIMIT 10;")
print("Services:\n", svcs)
countries = fetch("SELECT id, name FROM Country LIMIT 5;")
print("Countries:\n", countries)

# Get IDs
svc_rows = [l.split("\t") for l in svcs.splitlines()[1:]]
svc_map = {r[1].strip(): int(r[0]) for r in svc_rows if len(r) >= 2}
print("Service map:", svc_map)

cty_rows = [l.split("\t") for l in countries.splitlines()[1:]]
cty_map  = {r[1].strip(): int(r[0]) for r in cty_rows if len(r) >= 2}
print("Country map:", cty_map)

# Use first available country
cty_id = list(cty_map.values())[0] if cty_map else 1

# Map services to slots
def sid(name):
    for k, v in svc_map.items():
        if name.lower() in k.lower():
            return v
    return list(svc_map.values())[0] if svc_map else 1

candidates = [
    {
        "firstName": "Soa", "lastName": "Rakotondrabe",
        "gender": "F", "birthDate": "1998-03-15",
        "nationalId": "101 000 000 015", "phone": "034 12 345 67",
        "phone2": "032 98 765 43", "email": "soa.rako@gmail.com",
        "address": "Lot VK 45 Ambohibao", "city": "Antananarivo",
        "countryId": cty_id, "status": "validated",
        "source": "walk_in", "paymentMethodPref": "mobile_money",
        "mobileMoneyAccount": "034 12 345 67",
        "emergencyName1": "Rabe Rakotondrabe", "emergencyPhone1": "033 11 111 11", "emergencyRelation1": "Père",
        "guarantorName": "Rasoa Andrianaly", "guarantorPhone": "034 22 222 22", "guarantorJob": "Institutrice",
        "notes": "Très sérieuse, expérience 3 ans en ménage",
        "service": "ménage",
    },
    {
        "firstName": "Jean-Pierre", "lastName": "Andriamahefa",
        "gender": "M", "birthDate": "1990-07-22",
        "nationalId": "101 000 000 022", "phone": "033 56 789 01",
        "email": "jp.andriamahefa@yahoo.fr",
        "address": "Lot IV A 12 Ankadifotsy", "city": "Antananarivo",
        "countryId": cty_id, "status": "placed",
        "source": "referral", "paymentMethodPref": "mobile_money",
        "mobileMoneyAccount": "033 56 789 01",
        "emergencyName1": "Marie Andriamahefa", "emergencyPhone1": "034 44 444 44", "emergencyRelation1": "Épouse",
        "guarantorName": "Paul Andrianjafy", "guarantorPhone": "033 55 555 55", "guarantorJob": "Comptable",
        "notes": "Chauffeur professionnel, permis B et C, 8 ans d'expérience",
        "service": "chauffeur",
    },
    {
        "firstName": "Hanta", "lastName": "Razafindrakoto",
        "gender": "F", "birthDate": "2001-11-08",
        "nationalId": "101 000 000 038", "phone": "032 71 234 56",
        "email": "hanta.raza@gmail.com",
        "address": "Cité Andrefan'Ambohijanahary", "city": "Antananarivo",
        "countryId": cty_id, "status": "interviewed",
        "source": "online", "paymentMethodPref": "mobile_money",
        "mobileMoneyAccount": "032 71 234 56",
        "emergencyName1": "Noro Razafindrakoto", "emergencyPhone1": "034 66 666 66", "emergencyRelation1": "Mère",
        "guarantorName": "Fidy Rakotondrabe", "guarantorPhone": "033 77 777 77", "guarantorJob": "Enseignant",
        "notes": "Candidate pour garde d'enfants, formation CAP petite enfance",
        "service": "garde",
    },
    {
        "firstName": "Tovontsoa", "lastName": "Randriamanantsoa",
        "gender": "M", "birthDate": "1985-05-30",
        "nationalId": "101 000 000 044", "phone": "034 89 012 34",
        "email": "tovo.rand@gmail.com",
        "address": "Ampasanimalo Rue 12", "city": "Antananarivo",
        "countryId": cty_id, "status": "validated",
        "source": "walk_in", "paymentMethodPref": "bank_transfer",
        "bankAccount": "00040 00001 12345678901 23",
        "emergencyName1": "Lala Randriamanantsoa", "emergencyPhone1": "033 88 888 88", "emergencyRelation1": "Sœur",
        "guarantorName": "Roger Andrianivo", "guarantorPhone": "034 99 999 99", "guarantorJob": "Directeur commercial",
        "notes": "Agent de sécurité certifié, ancien militaire 5 ans",
        "service": "sécurité",
    },
    {
        "firstName": "Miora", "lastName": "Rakotoarisoa",
        "gender": "F", "birthDate": "1995-09-14",
        "nationalId": "101 000 000 057", "phone": "033 24 567 89",
        "phone2": "034 35 678 90", "email": "miora.rako@gmail.com",
        "address": "Lot IVN 7B Mahamasina", "city": "Antananarivo",
        "countryId": cty_id, "status": "applied",
        "source": "social", "paymentMethodPref": "mobile_money",
        "mobileMoneyAccount": "033 24 567 89",
        "emergencyName1": "Rivo Rakotoarisoa", "emergencyPhone1": "033 10 101 01", "emergencyRelation1": "Frère",
        "guarantorName": "Sahondra Ratsimbazafy", "guarantorPhone": "034 20 202 02", "guarantorJob": "Infirmière",
        "notes": "Cuisinière expérimentée, spécialité cuisine malgache et française",
        "service": "cuisine",
    },
]

inserted = []
for c in candidates:
    svc_id = sid(c["service"])
    sql = (
        f"INSERT INTO Candidate "
        f"(countryId, firstName, lastName, gender, birthDate, nationalId, phone, phone2, email, "
        f"address, city, primarySpecialtyId, status, source, paymentMethodPref, "
        f"mobileMoneyAccount, bankAccount, "
        f"emergencyName1, emergencyPhone1, emergencyRelation1, "
        f"guarantorName, guarantorPhone, guarantorJob, notes, createdAt, updatedAt) VALUES ("
        f"{c['countryId']}, "
        f"'{c['firstName']}', '{c['lastName']}', '{c['gender']}', "
        f"'{c.get('birthDate', '1990-01-01')}', "
        f"'{c.get('nationalId', '')}', '{c['phone']}', "
        f"'{c.get('phone2', '')}', '{c.get('email', '')}', "
        f"'{c.get('address', '')}', '{c.get('city', '')}', "
        f"{svc_id}, '{c['status']}', '{c['source']}', '{c['paymentMethodPref']}', "
        f"'{c.get('mobileMoneyAccount', '')}', '{c.get('bankAccount', '')}', "
        f"'{c.get('emergencyName1', '')}', '{c.get('emergencyPhone1', '')}', '{c.get('emergencyRelation1', '')}', "
        f"'{c.get('guarantorName', '')}', '{c.get('guarantorPhone', '')}', '{c.get('guarantorJob', '')}', "
        f"'{c.get('notes', '')}', NOW(), NOW()"
        f");"
    )
    q(sql)
    last_id = fetch("SELECT LAST_INSERT_ID();").splitlines()[-1].strip()
    inserted.append((int(last_id), svc_id, c["firstName"], c["lastName"]))
    print(f"  Inserted: {c['firstName']} {c['lastName']} id={last_id} svc={svc_id}")

# Create CandidateSpecialty entries
for (cid, svc_id, fn, ln) in inserted:
    if cid > 0 and svc_id > 0:
        q(f"INSERT IGNORE INTO CandidateSpecialty (candidateId, serviceId, isPrimary) VALUES ({cid}, {svc_id}, 1);")
        print(f"  Specialty: {fn} {ln} -> service {svc_id}")

# Add 2 evaluations for the first two candidates
if len(inserted) >= 2:
    # Need a clientId — grab first client
    cl = fetch("SELECT id FROM Client LIMIT 1;").splitlines()
    client_id = int(cl[-1]) if len(cl) > 1 else None
    if client_id:
        for i, (cid, _, fn, ln) in enumerate(inserted[:2]):
            q(f"""INSERT INTO Evaluation
                (candidateId, clientId, date, overallRating,
                 punctuality, quality, behavior, appearance,
                 instructions, discretion, honesty, initiative, hygiene,
                 comment, recommend, createdAt)
                VALUES ({cid}, {client_id}, NOW(), {4 + (i % 2)},
                        {4+i%2}, {4}, {5}, {4+i%2},
                        {3+i}, {4}, {5}, {3+i%2}, {4},
                        'Très bon travail, ponctuelle et discrète.', 'yes', NOW());""")
            print(f"  Eval added for {fn} {ln}")

print("\nAll done!")
ssh.close()
