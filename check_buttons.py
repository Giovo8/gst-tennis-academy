import re
import os

# Lista di tutti i file da controllare
files = [
    "src/app/dashboard/admin/(main)/arena/challenge/[id]/edit/page.tsx",
    "src/app/dashboard/admin/(main)/arena/challenge/[id]/page.tsx",
    "src/app/dashboard/admin/(main)/arena/create-challenge/page.tsx",
    "src/app/dashboard/admin/(main)/arena/page.tsx",
    "src/app/dashboard/admin/(main)/communications/page.tsx",
    "src/app/dashboard/admin/bookings/[id]/page.tsx",
    "src/app/dashboard/admin/bookings/modifica/page.tsx",
    "src/app/dashboard/admin/bookings/new/page.tsx",
    "src/app/dashboard/admin/chat/page.tsx",
    "src/app/dashboard/admin/corsi/[id]/lezioni/[date]/modifica/page.tsx",
    "src/app/dashboard/admin/corsi/[id]/lezioni/[date]/page.tsx",
    "src/app/dashboard/admin/corsi/[id]/page.tsx",
    "src/app/dashboard/admin/corsi/[id]/partecipanti/[userId]/page.tsx",
    "src/app/dashboard/admin/corsi/[id]/partecipanti/ospite/[guestName]/page.tsx",
    "src/app/dashboard/admin/corsi/new/page.tsx",
    "src/app/dashboard/admin/corsi/page.tsx",
    "src/app/dashboard/admin/courts/[id]/page.tsx",
    "src/app/dashboard/admin/courts/modifica/page.tsx",
    "src/app/dashboard/admin/courts/new/page.tsx",
    "src/app/dashboard/admin/courts/page.tsx",
    "src/app/dashboard/admin/invite-codes/page.tsx",
    "src/app/dashboard/admin/news/page.tsx",
    "src/app/dashboard/admin/page.tsx",
    "src/app/dashboard/admin/platform-logs/page.tsx",
    "src/app/dashboard/admin/staff/page.tsx",
    "src/app/dashboard/admin/users/page.tsx",
    "src/app/dashboard/admin/video-lessons/page.tsx",
    "src/app/dashboard/atleta/(main)/arena/challenge/[id]/page.tsx",
    "src/app/dashboard/atleta/(main)/arena/choose-opponent/page.tsx",
    "src/app/dashboard/atleta/(main)/arena/configure-challenge/[opponentId]/page.tsx",
    "src/app/dashboard/atleta/(main)/arena/info/page.tsx",
    "src/app/dashboard/atleta/(main)/arena/page.tsx",
    "src/app/dashboard/atleta/(main)/bookings/[id]/edit/page.tsx",
    "src/app/dashboard/atleta/(main)/bookings/[id]/page.tsx",
    "src/app/dashboard/atleta/(main)/bookings/new/page.tsx",
    "src/app/dashboard/atleta/(main)/bookings/page.tsx",
    "src/app/dashboard/atleta/(main)/corsi/[id]/page.tsx",
    "src/app/dashboard/atleta/(main)/corsi/page.tsx",
    "src/app/dashboard/atleta/(main)/mail/page.tsx",
    "src/app/dashboard/atleta/(main)/page.tsx",
    "src/app/dashboard/atleta/(main)/profile/modifica/page.tsx",
    "src/app/dashboard/atleta/(main)/profile/page.tsx",
    "src/app/dashboard/atleta/(main)/tornei/[id]/page.tsx",
    "src/app/dashboard/atleta/(main)/tornei/archivio/page.tsx",
    "src/app/dashboard/atleta/(main)/tornei/page.tsx",
    "src/app/dashboard/atleta/(main)/tornei/statistiche/page.tsx",
    "src/app/dashboard/atleta/(main)/videos/[id]/page.tsx",
    "src/app/dashboard/atleta/(main)/videos/page.tsx",
    "src/app/dashboard/maestro/(main)/bookings/corso/[id]/[date]/page.tsx",
    "src/app/dashboard/maestro/(main)/corsi/[id]/lezioni/[date]/page.tsx",
    "src/app/dashboard/maestro/(main)/corsi/page.tsx",
]

results_with_w_full = []
results_without_w_full = []
no_button_found = []

for file_path in sorted(files):
    full_path = f"c:\\Users\\giova\\Desktop\\gst-tennis-academy\\{file_path}"
    
    if not os.path.exists(full_path):
        continue
    
    try:
        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Trova la posizione di "space-y-6 pt-3"
        pattern = r'className=["\']space-y-6 pt-3["\']'
        match = re.search(pattern, content)
        
        if not match:
            continue
        
        # Estrai il contenuto dopo il div
        start_pos = match.end()
        # Cerca il content del div
        # Prendi i prossimi 2000 caratteri per controllare i primi elementi
        next_content = content[start_pos:start_pos + 2000]
        
        # Estrai il resto del div fino al primo elemento vero (non spazi/newlines)
        # Cerchiamo il primo elemento tag dopo space-y-6 pt-3
        tag_match = re.search(r'>\s*<[a-zA-Z]', next_content)
        if tag_match:
            first_elem_start = tag_match.end() - 1
            elem_content = next_content[first_elem_start:first_elem_start + 1000]
            
            # Estrai il primo tag
            tag_name_match = re.match(r'<([a-zA-Z]+)', elem_content)
            if tag_name_match:
                first_tag = tag_name_match.group(1)
                
                # Se è button o Link, controlla se ha w-full
                if first_tag.lower() in ['button', 'link']:
                    # Estrai il className fino al prossimo '>'
                    classname_match = re.search(r'className=["\']([^"\']+)["\']', elem_content)
                    if classname_match:
                        classname = classname_match.group(1)
                        if 'w-full' in classname:
                            results_with_w_full.append(file_path)
                        else:
                            results_without_w_full.append(file_path)
                else:
                    # Non è button o link subito dopo
                    no_button_found.append(file_path)
            else:
                no_button_found.append(file_path)
        else:
            no_button_found.append(file_path)
            
    except Exception as e:
        print(f"Errore in {file_path}: {e}")

print("=" * 80)
print("REPORT: Bottoni con w-full dopo <div className=\"space-y-6 pt-3\">")
print("=" * 80)
print()
print(f"✅ BOTTONI/LINK con w-full ({len(results_with_w_full)} file):")
for f in results_with_w_full:
    print(f"  {f}")
print()
print(f"❌ MANCA w-full ({len(results_without_w_full)} file):")
for f in results_without_w_full:
    print(f"  {f}")
print()
print(f"ℹ️  Nessun bottone/link come primo elemento ({len(no_button_found)} file):")
for f in no_button_found[:10]:  # Mostra primi 10
    print(f"  {f}")
if len(no_button_found) > 10:
    print(f"  ... e {len(no_button_found) - 10} altri")
