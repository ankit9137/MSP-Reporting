import os
import glob
import csv
import json

# Paths
DESKTOP_DATA_DIR = os.path.join(os.path.expanduser("~"), "Desktop", "Data")
OUTPUT_JS = os.path.join(os.path.dirname(__file__), "dashboard-data.js")

def is_row_licensed(row):
    # Your export uses a "Licenses" column with values like "Unlicensed" or
    # license names such as "Microsoft 365 E5". Treat anything that is not
    # empty and not equal to "Unlicensed" as licensed.
    licenses_field = row.get("Licenses") or row.get("licenses") or ""
    val = str(licenses_field).strip().lower()
    if not val:
        return False
    if val == "unlicensed":
        return False
    return True

def normalize_client_name(name):
    """
    Intelligently maps different variations of client names into a single 
    consistent canonical name.
    """
    if not name:
        return "(unknown)"
    
    n = name.lower().strip()
    
    # Mapping Rules
    if "alliant" in n: return "Alliant"
    if "amstar" in n: return "Amstar"
    if "boulder property" in n: return "Boulder Property Management"
    if "brinkman" in n: return "Brinkman"
    if "conifer" in n: return "Conifer Medical"
    if "continuum" in n: return "Continuum Partners"
    if "crestline" in n: return "Crestline Advisory"
    if "antonoff" in n: return "Antonoff & Co"
    if "bohemian" in n: return "Bohemian Companies"
    if "greyhill" in n: return "Greyhill"
    if "greyhill" in n: return "Greyhill"
    if "derp" in n or "employee retirement" in n: return "DERP"
    if "harper group" in n or "harpergroup" in n: return "Harper Group"
    if "homebase" in n: return "HomeBase"
    if "jet infrastructure" in n: return "JET Infrastructure"
    if "johannessen" in n: return "Johannessen"
    if "keystone" in n: return "KeyStone"
    if "ndtco" in n or "new direction trust" in n: return "NDTCO"
    if "pinery" in n: return "Pinery Water"
    if "powertech" in n or "power technologies" in n: return "PowerTech"
    if "pure cycle" in n: return "Pure Cycle"
    if "reese henry" in n: return "Reese Henry"
    if "town of avon" in n: return "Town of Avon"
    if "ultimate hydro" in n: return "Ultimate Hydro"
    if "unmf" in n or "new mexico foundation" in n: return "UNMF"
    if "western disposal" in n: return "Western Disposal"
    if "betawest" in n: return "Betawest"
    
    # If no rule matches, return original trimmed name
    return name.strip()

def map_user_row(row, filename):
    client_name = filename.replace(" User List Feb.csv", "").strip()
    client_name = normalize_client_name(client_name)
    
    if not is_row_licensed(row):
        return None

    return {
        "client": client_name,
        "name": row.get("Display name") or row.get("DisplayName") or "",
        "upn": row.get("User principal name") or row.get("UserPrincipalName") or row.get("UPN") or "",
        "licenses": row.get("Licenses") or row.get("licenses") or ""
    }

def map_device_row(row):
    client_name = row.get("Company") or row.get("Client") or ""
    client_name = normalize_client_name(client_name)
    
    device_name = row.get("Computer Name") or row.get("DeviceName") or ""
    os_name = row.get("OS") or row.get("OperatingSystem") or ""
    
    if not device_name: return None
    
    return {
        "client": client_name,
        "name": device_name,
        "os": os_name
    }

def main():
    print(f"Reading CSVs from: {DESKTOP_DATA_DIR}")

    # 1. Load users
    all_users = []
    user_files = glob.glob(os.path.join(DESKTOP_DATA_DIR, "* User List Feb.csv"))
    for path in user_files:
        with open(path, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                mapped = map_user_row(row, os.path.basename(path))
                if mapped: all_users.append(mapped)

    # 2. Load devices
    all_devices = []
    devices_path = os.path.join(DESKTOP_DATA_DIR, "cwa-computers.csv")
    if os.path.exists(devices_path):
        with open(devices_path, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                mapped = map_device_row(row)
                if mapped: all_devices.append(mapped)

    # 3. Aggregate
    clients = sorted(list(set([u['client'] for u in all_users] + [d['client'] for d in all_devices if d['client']])))
    
    per_client = {}
    users_by_client = {}
    devices_by_client = {}

    for c in clients:
        c_users = [u for u in all_users if u['client'] == c]
        c_devices = [d for d in all_devices if d['client'] == c]
        
        per_client[c] = {
            "usersCount": len(c_users),
            "devicesCount": len(c_devices)
        }
        users_by_client[c] = c_users
        devices_by_client[c] = c_devices

    summary = {
        "totalClients": len(clients),
        "totalUsersLicensed": len(all_users),
        "totalDevices": len(all_devices),
        "allUsers": all_users,
        "allDevices": all_devices,
        "perClient": per_client,
        "usersByClient": users_by_client,
        "devicesByClient": devices_by_client,
        "billingByClient": {} # Placeholder for future billing CSV
    }

    with open(OUTPUT_JS, "w", encoding="utf-8") as f:
        f.write("window.MSP_DASHBOARD_DATA = ")
        json.dump(summary, f, indent=2)
        f.write(";\n")

    print(f"Summary: Clients={len(clients)}, Users={len(all_users)}, Devices={len(all_devices)}")
    print(f"Data written to {OUTPUT_JS}")

if __name__ == "__main__":
    main()
