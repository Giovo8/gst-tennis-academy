import os
import re

files = [
    r"src\app\dashboard\admin\(main)\arena\challenge\[id]\page.tsx",
    r"src\app\dashboard\admin\(main)\arena\challenge\[id]\edit\page.tsx",
    r"src\app\dashboard\admin\(main)\arena\create-challenge\page.tsx",
    r"src\app\dashboard\admin\corsi\new\page.tsx",
    r"src\app\dashboard\admin\corsi\[id]\page.tsx",
    r"src\app\dashboard\admin\corsi\[id]\lezioni\[date]\page.tsx",
    r"src\app\dashboard\admin\corsi\[id]\lezioni\[date]\modifica\page.tsx",
    r"src\app\dashboard\admin\corsi\[id]\partecipanti\ospite\[guestName]\page.tsx",
    r"src\app\dashboard\admin\corsi\[id]\partecipanti\[userId]\page.tsx",
    r"src\app\dashboard\admin\courts\page.tsx",
    r"src\app\dashboard\admin\courts\modifica\page.tsx",
    r"src\app\dashboard\admin\courts\new\page.tsx",
    r"src\app\dashboard\admin\courts\[id]\page.tsx",
    r"src\app\dashboard\admin\invite-codes\page.tsx",
    r"src\app\dashboard\admin\invite-codes\new\page.tsx",
    r"src\app\dashboard\admin\invite-codes\[id]\page.tsx",
    r"src\app\dashboard\admin\job-applications\[id]\page.tsx",
    r"src\app\dashboard\admin\news\[id]\page.tsx",
    r"src\app\dashboard\admin\staff\new\page.tsx",
    r"src\app\dashboard\admin\staff\[id]\page.tsx",
    r"src\app\dashboard\admin\tornei\new\page.tsx",
    r"src\app\dashboard\admin\tornei\[id]\page.tsx",
    r"src\app\dashboard\admin\users\modifica\page.tsx",
    r"src\app\dashboard\admin\users\new\page.tsx",
    r"src\app\dashboard\admin\users\[id]\page.tsx",
    r"src\app\dashboard\admin\video-lessons\new\page.tsx",
    r"src\app\dashboard\atleta\(main)\arena\challenge\[id]\page.tsx",
    r"src\app\dashboard\atleta\(main)\arena\choose-opponent\page.tsx",
    r"src\app\dashboard\atleta\(main)\arena\configure-challenge\[opponentId]\page.tsx",
    r"src\app\dashboard\atleta\(main)\arena\info\page.tsx",
    r"src\app\dashboard\atleta\(main)\bookings\[id]\page.tsx",
    r"src\app\dashboard\atleta\(main)\corsi\[id]\page.tsx",
    r"src\app\dashboard\atleta\(main)\tornei\archivio\page.tsx",
    r"src\app\dashboard\atleta\(main)\tornei\statistiche\page.tsx",
    r"src\app\dashboard\atleta\(main)\tornei\[id]\page.tsx",
    r"src\app\dashboard\maestro\(main)\bookings\corso\[id]\[date]\page.tsx",
    r"src\app\dashboard\maestro\(main)\corsi\[id]\page.tsx",
    r"src\app\dashboard\maestro\(main)\corsi\[id]\lezioni\[date]\page.tsx",
    r"src\app\dashboard\maestro\(main)\corsi\[id]\partecipanti\ospite\[guestName]\page.tsx",
    r"src\app\dashboard\maestro\(main)\corsi\[id]\partecipanti\[userId]\page.tsx",
]

def scan_file(filepath):
    if not os.path.exists(filepath):
        return
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    
    if "space-y-6 pt-3" not in content or "breadcrumb" not in content:
        return
    
    # Let's find index of "space-y-6 pt-3"
    idx = content.find("space-y-6 pt-3")
    while idx != -1:
        start = max(0, idx - 100)
        end = min(len(content), idx + 2000)
        fragment = content[start:end]
        print(f"FILE: {filepath}")
        print("FRAGMENT:")
        print(fragment)
        print("="*80)
        idx = content.find("space-y-6 pt-3", idx + 1)

for f in files:
    scan_file(f)
