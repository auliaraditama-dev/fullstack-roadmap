from __future__ import annotations
import json, re, shutil
from pathlib import Path
import fitz
from pptx import Presentation

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT/'src/data'
PUBLIC = ROOT/'public/sources'
PUBLIC.mkdir(parents=True, exist_ok=True)

PDFS = [
    ('go-vue-postgresql','Belajar Full-Stack Go + Vue + PostgreSQL dari Fundamental','Go + Vue + PostgreSQL','Roadmap fundamental Go, Vue, PostgreSQL, Git, Docker, API, latihan algoritma, dan project.','Belajar_FullStack_Go_Vue_PostgreSQL_Dari_Fundamental_Color_Syntax(3).pdf','Belajar_FullStack_Go_Vue_PostgreSQL_Dari_Fundamental_Color_Syntax.pdf','cyan'),
    ('fullstack-developer-2026','Buku Lengkap Full-Stack Developer 2026','Buku Lengkap 2026','Materi terpadu fondasi, PHP, Laravel, Vue 3, TypeScript, testing, security, production, Go, AI, privacy, cloud, API, dan workflow.','Buku_Lengkap_FullStack_Developer_2026_Full_Materi(3).pdf','Buku_Lengkap_FullStack_Developer_2026_Full_Materi.pdf','violet'),
    ('roadmap-fullstack-2026','Roadmap Belajar Full-Stack Developer 2026','Roadmap Full-Stack 2026','Peta belajar dari dasar komputer sampai Laravel, Vue, TypeScript, quality, production, Docker, CI/CD, Go, dan project.','Roadmap_Belajar_FullStack_2026_Lengkap(4).pdf','Roadmap_Belajar_FullStack_2026_Lengkap.pdf','amber'),
]
PPTS = [
    ('go-lang-dasar','Go-Lang Dasar','Go-Lang Dasar','Deck sintaks Go komprehensif dari setup sampai error, package, pointer, interface, dan struct.','Go-Lang Dasar.pptx','Go-Lang-Dasar.pptx','blue'),
    ('laravel-dasar','Laravel Dasar','Laravel Dasar','Deck Laravel dari pengenalan, project, lifecycle, DI, routing, controller, middleware, request, session, dan error handling.','Laravel Dasar.pptx','Laravel-Dasar.pptx','emerald'),
    ('sesi-01-logika','Logika Pemrograman & Algoritma','Sesi 1','Format kelas 3 jam: logika, algoritma, pseudocode, flowchart, kontrol, fungsi, struktur data, latihan, dan komunikasi.','Sesi1_Logika_Pemrograman_dan_Algoritma.pptx','Sesi1-Logika-Pemrograman-dan-Algoritma.pptx','cyan'),
    ('sesi-02-go','Pengenalan Go & Sintaks Dasar','Sesi 2','Format kelas 3 jam: pengenalan Go, setup, module, sintaks dasar, latihan, dan komunikasi efektif.','Sesi2_Go_Pengenalan_dan_Sintaks_Dasar.pptx','Sesi2-Go-Pengenalan-dan-Sintaks-Dasar.pptx','blue'),
    ('sesi-03-go','Kontrol Aliran & Struktur Data Go','Sesi 3','Format kelas 3 jam: if/else, switch, for, array, slice, map, struct, latihan, dan komunikasi.','Sesi3_Go_Kontrol_Aliran_dan_Struktur_Data.pptx','Sesi3-Go-Kontrol-Aliran-dan-Struktur-Data.pptx','indigo'),
]

source_units=[]
source_library=[]
for sid,title,short,desc,inp,out,accent in PDFS:
    src=PUBLIC / out
    dst=PUBLIC/out
    if src.resolve() != dst.resolve(): shutil.copy2(src,dst)
    doc=fitz.open(src)
    units=[]
    for i,p in enumerate(doc,1):
        txt=p.get_text('text').replace('\x00','').strip()
        units.append({'unit':i,'label':f'Halaman {i}','heading':'','text':txt,'notes':''})
    source_library.append({'id':sid,'title':title,'shortTitle':short,'description':desc,'kind':'pdf','file':f'/sources/{out}','unitLabel':'HALAMAN','unitCount':len(units),'accent':accent,'units':units})
    source_units.append((sid, len(units)))
for sid,title,short,desc,inp,out,accent in PPTS:
    src=PUBLIC / out
    dst=PUBLIC/out
    if src.resolve() != dst.resolve(): shutil.copy2(src,dst)
    prs=Presentation(src)
    units=[]
    for i,slide in enumerate(prs.slides,1):
        texts=[]
        for sh in slide.shapes:
            if hasattr(sh,'text') and sh.text and sh.text.strip():
                texts.append(sh.text.strip())
        body='\n\n'.join(texts)
        heading=texts[0] if texts else ''
        try:
            notes=slide.notes_slide.notes_text_frame.text.strip()
        except Exception:
            notes=''
        units.append({'unit':i,'label':f'Slide {i}','heading':heading,'text':body,'notes':notes})
    source_library.append({'id':sid,'title':title,'shortTitle':short,'description':desc,'kind':'pptx','file':f'/sources/{out}','unitLabel':'SLIDE','unitCount':len(units),'accent':accent,'units':units})
    source_units.append((sid, len(units)))

(DATA/'source-library.json').write_text(json.dumps(source_library,ensure_ascii=False,indent=2),encoding='utf-8')
# Backward-compatible compact source pages: all units, generalized.
flat=[]
for src in source_library:
    for u in src['units']:
        flat.append({'sourceId':src['id'],'unit':u['unit'],'label':u['label'],'heading':u['heading'],'text':u['text'],'notes':u['notes']})
(DATA/'source-pages.json').write_text(json.dumps(flat,ensure_ascii=False,indent=2),encoding='utf-8')

# Book chapter metadata already exists in the project; derive exact chapter page spans and practice/checkpoint snippets from source PDF.
book_doc=fitz.open(PUBLIC/'Buku_Lengkap_FullStack_Developer_2026_Full_Materi.pdf')
book_chapters=json.loads((DATA/'fullstack-chapters.json').read_text(encoding='utf-8'))
for ch in book_chapters:
    texts=[]
    for p in range(ch['startPage'],ch['endPage']+1):
        texts.append(book_doc[p-1].get_text('text'))
    full='\n'.join(texts)
    for section_name, key in [('Latihan praktik','practice'),('Checkpoint kompetensi','checkpoint'),('Materi inti','core')]:
        idx=full.find(section_name)
        if idx<0:
            ch[key]=[] if key in ('practice','checkpoint') else ''
            continue
        end=len(full)
        for nxt in ['Kesalahan umum','Checkpoint kompetensi','Latihan praktik','Contoh kode lengkap','Mental model']:
            if nxt==section_name: continue
            j=full.find(nxt,idx+len(section_name))
            if j>=0: end=min(end,j)
        block=full[idx+len(section_name):end].strip()
        if key=='core': ch[key]=block[:2500]
        elif key=='checkpoint': ch[key]=block[:1000]
        else:
            items=[]
            for line in block.splitlines():
                s=line.strip(' \t•-')
                if re.match(r'^\d+\.\s+',s) or (s.startswith('Buat ') or s.startswith('Tambahkan ') or s.startswith('Audit ') or s.startswith('Ambil ') or s.startswith('Uji ') or s.startswith('Tulis ') or s.startswith('Gunakan ') or s.startswith('Bikin ') or s.startswith('Modelkan ')):
                    if s and len(s)>8 and s not in items: items.append(s)
            ch[key]=items[:5]
(DATA/'book-chapter-details.json').write_text(json.dumps(book_chapters,ensure_ascii=False,indent=2),encoding='utf-8')

# Session plan. Each session is a pedagogical packaging of source material, not a claim that the source documents themselves define all 36 boundaries.
parts=[
    {'id':'fondasi','title':'Fondasi & problem solving','start':1,'end':5,'accent':'cyan'},
    {'id':'web','title':'Web fundamental','start':6,'end':14,'accent':'blue'},
    {'id':'backend','title':'PHP, data & Laravel','start':15,'end':23,'accent':'emerald'},
    {'id':'frontend','title':'Frontend modern','start':24,'end':26,'accent':'amber'},
    {'id':'quality','title':'Quality engineering','start':27,'end':29,'accent':'rose'},
    {'id':'production','title':'Production, Docker & CI/CD','start':30,'end':32,'accent':'violet'},
    {'id':'go-specialization','title':'Go backend specialization','start':33,'end':34,'accent':'indigo'},
    {'id':'project-career','title':'Project, AI & karier','start':35,'end':36,'accent':'orange'},
]
(DATA/'parts.json').write_text(json.dumps(parts,ensure_ascii=False,indent=2),encoding='utf-8')

# Helper to map book chapter refs.
def bref(start,end): return {'sourceId':'fullstack-developer-2026','unitType':'page','start':book_chapters[start-1]['startPage'],'end':book_chapters[end-1]['endPage'],'label':f'Bab {start}–{end} Buku Lengkap 2026'}
def rref(start,end): return {'sourceId':'roadmap-fullstack-2026','unitType':'page','start':start,'end':end,'label':f'Halaman {start}–{end} Roadmap 2026'}
def gref(start,end): return {'sourceId':'go-lang-dasar','unitType':'slide','start':start,'end':end,'label':f'Slide {start}–{end} Go-Lang Dasar'}
def lref(start,end): return {'sourceId':'laravel-dasar','unitType':'slide','start':start,'end':end,'label':f'Slide {start}–{end} Laravel Dasar'}
def sref(sid,start,end,label=None): return {'sourceId':sid,'unitType':'slide','start':start,'end':end,'label':label or f'Slide {start}–{end}'}
def gpref(start,end): return {'sourceId':'go-vue-postgresql','unitType':'page','start':start,'end':end,'label':f'Halaman {start}–{end} Go + Vue + PostgreSQL'}

# Build human-readable source summaries from book metadata.
def ch_titles(a,b): return [c['title'] for c in book_chapters if a<=c['number']<=b]
def practices(a,b):
    out=[]
    for c in book_chapters:
        if a<=c['number']<=b:
            for p in c.get('practice',[]):
                if p not in out: out.append(p)
    return out[:6]
def checkpoints(a,b):
    out=[]
    for c in book_chapters:
        if a<=c['number']<=b:
            cp=c.get('checkpoint',[])
            if isinstance(cp,list): out.extend(cp)
    return out[:3]

def agenda():
    return [
        {'time':'00:00–00:10','minutes':10,'label':'Pembukaan & review tugas'},
        {'time':'00:10–00:40','minutes':30,'label':'Konsep inti 1'},
        {'time':'00:40–01:10','minutes':30,'label':'Konsep inti 2'},
        {'time':'01:10–01:20','minutes':10,'label':'Istirahat'},
        {'time':'01:20–01:50','minutes':30,'label':'Konsep inti 3'},
        {'time':'01:50–02:30','minutes':40,'label':'Hands-on dan modifikasi'},
        {'time':'02:30–02:50','minutes':20,'label':'Komunikasi, refleksi & debugging'},
        {'time':'02:50–03:00','minutes':10,'label':'Checkpoint, tugas & penutup'},
    ]

sessions=[
 {'n':1,'part':'fondasi','title':'Logika Pemrograman & Algoritma','description':'Membangun pola pikir sistematis sebelum menyentuh syntax: pemrograman, input-process-output, algoritma, pseudocode, flowchart, kontrol, fungsi, array/list, latihan dan komunikasi.','objectives':['Menjelaskan pemrograman, algoritma, pseudocode, dan flowchart.','Memakai variabel, operator, percabangan, perulangan, fungsi, dan array/list pada level logika.','Memecah masalah menjadi input, proses, output, edge case, dan pengujian.'],'practice':['Cek apakah sebuah bilangan prima.','Hitung rata-rata elemen dalam array.','Cari nilai terbesar dalam array.','Kerjakan deret 1..N, jumlah 1..N, dan Fibonacci.'],'checkpoint':['Bisa menjelaskan input → process → output dengan contoh sendiri.','Bisa menulis pseudocode sebelum coding.','Bisa men-trace solusi dengan data contoh.'],'sourceRefs':[sref('sesi-01-logika',1,31,'Seluruh Sesi 1'),rref(2,5),gpref(5,8)]},
 {'n':2,'part':'fondasi','title':'Pengenalan Go & Sintaks Dasar','description':'Menyiapkan Go SDK dan workspace, memahami module, program pertama, variable, konstanta, tipe data, konversi, dan operator.','objectives':['Menjelaskan sifat dasar dan workflow bahasa Go.','Membuat module Go dan menjalankan program pertama.','Menggunakan variable, const, tipe data dasar, konversi, dan operator.'],'practice':['Buat module dan program Halo Go.','Hitung BMI menggunakan float64.','Konversi total detik menjadi jam, menit, dan detik.'],'checkpoint':['go version bekerja.','go mod init dan go run . dipahami.','Perbedaan var, :=, const, int, float64, string, bool dapat dijelaskan.'],'sourceRefs':[sref('sesi-02-go',1,35,'Seluruh Sesi 2'),gref(1,80),gpref(9,14),rref(5,6)]},
 {'n':3,'part':'fondasi','title':'Kontrol Aliran & Struktur Data Go','description':'Menerapkan if-else, switch, for, break, continue, array, slice, map, dan struct dalam program Go.','objectives':['Memakai if-else dan switch untuk pengambilan keputusan.','Memakai for, break, continue, dan range.','Menyimpan data dengan array, slice, map, dan struct.'],'practice':['Klasifikasikan nilai dengan if/else.','Buat program yang memakai switch.','Olah daftar data dengan array/slice/map.'],'checkpoint':['Dapat memilih struktur kontrol sesuai kebutuhan.','Dapat menjelaskan perbedaan array, slice, map, dan struct.','Dapat membuat program daftar data sederhana.'],'sourceRefs':[sref('sesi-03-go',1,34,'Seluruh Sesi 3'),gref(81,133),gpref(15,24),rref(6,7)]},
 {'n':4,'part':'fondasi','title':'Function, Scope, Multiple Return & Error di Go','description':'Mendalami function Go: parameter, return value, multiple return, named return, variadic, function value, closure, recursive function, defer, panic, recover, dan komentar.','objectives':['Membuat function dengan parameter dan return value.','Memakai multiple return dan function sebagai value/parameter.','Memahami closure, recursion, defer, panic, dan recover.'],'practice':['Buat function kalkulasi dengan multiple return.','Buat function variadic dan function yang menerima function lain.','Implementasikan faktorial dengan loop lalu bandingkan dengan recursion.'],'checkpoint':['Function kecil dapat dibuat dari requirement.','Error/hasil tambahan dapat dikembalikan secara eksplisit.','Scope dan lifecycle nilai dapat dilacak.'],'sourceRefs':[gref(134,186),gpref(25,31),rref(5,6)]},
 {'n':5,'part':'fondasi','title':'Struct, Interface, Pointer, Package & Error','description':'Menyelesaikan fondasi Go dari struct/method hingga interface, pointer, package/import, access modifier, initialization, blank identifier, error interface dan custom error.','objectives':['Memodelkan entitas dengan struct dan method.','Memahami interface, pointer, pass by value, dan pointer receiver.','Memisahkan kode dengan package serta menangani error secara idiomatik.'],'practice':['Buat struct dengan method untuk entitas sederhana.','Buat interface dan dua implementasi.','Buat custom error dan cek jenis error.'],'checkpoint':['Dapat menjelaskan kapan memakai pointer.','Dapat menjelaskan interface sebagai kontrak perilaku.','Dapat menyusun package kecil tanpa duplikasi main function.'],'sourceRefs':[gref(187,266),gpref(32,37),rref(20,21)]},
]

book_session_map=[
 (6,'web', 'Lingkungan Kerja Developer & Git/GitHub',1,2),
 (7,'web', 'PHP Fundamental & Problem Solving',3,4),
 (8,'web', 'OOP & Clean Code Dasar',5,6),
 (9,'web', 'CSS Modern & Responsive Design',7,7),
 (10,'web','JavaScript Fundamental',8,8),
 (11,'web','Browser, DOM, DevTools & Debugging',9,10),
 (12,'web','HTTP, JSON, Cookie, Session, CORS & Caching',10,11),
 (13,'web','Accessibility, SEO, Performance & UX',11,12),
 (14,'backend','Database Relasional & SQL',12,12),
 (15,'backend','PHP Web Tanpa Framework & PDO',13,14),
 (16,'backend','Composer, Dependency, Namespace & Autoload',14,14),
 (17,'backend','Laravel 13: Fondasi sampai Backend Utama',15,15),
 (18,'backend','Arsitektur Laravel: Clean Structure, DI & Container',16,16),
 (19,'backend','Node.js, npm & Vite untuk Tooling',17,18),
 (20,'backend','Laravel Routing, Controller, View & Request',15,15),
 (21,'backend','Laravel Storage, Response, Encryption, Cookie & Redirect',15,16),
 (22,'backend','Laravel Middleware, CSRF, Session & Error Handling',15,16),
 (23,'backend','Laravel Backend: Eloquent, Validation, Auth, Authorization & API',15,16),
 (24,'frontend','TypeScript',18,18),
 (25,'frontend','Vue 3 Fundamental',19,19),
 (26,'frontend','Laravel + Vue + Inertia & State Management',20,21),
 (27,'quality','Testing Strategy',22,22),
 (28,'quality','Web Security & OWASP Mindset',23,23),
 (29,'quality','Performance Engineering & Observability',24,25),
 (30,'production','Linux, DNS, HTTPS & Web Server',26,27),
 (31,'production','Deployment Laravel, Docker & CI/CD',28,30),
 (32,'production','Backup, Disaster Recovery & Production Operations',31,31),
 (33,'go-specialization','Fondasi Go Specialization & Concurrency',32,33),
 (34,'go-specialization','Backend Go & Laravel vs Go',34,35),
 (35,'project-career','Project Utama, Roadmap, Checkpoint, Debugging & Refactoring',36,44),
 (36,'project-career','AI, Supply Chain, Privacy, Cloud, API, Workflow & Karier',45,51),
]
for n,part,title,a,b in book_session_map:
    part_title=next(x['title'] for x in parts if x['id']==part)
    refs=[bref(a,b)]
    # Roadmap page coverage by stage, with intentional overlap to keep each topic visible in session context.
    rp={6:(3,4),7:(4,5),8:(5,6),9:(6,6),10:(6,7),11:(7,7),12:(7,8),13:(8,8),14:(9,9),15:(9,9),16:(9,10),17:(10,11),18:(12,12),19:(13,13),20:(14,14),21:(14,15),22:(15,15),23:(15,16),24:(13,14),25:(13,14),26:(14,15),27:(15,15),28:(15,16),29:(16,16),30:(17,17),31:(18,19),32:(19,19),33:(20,20),34:(20,21),35:(21,23),36:(24,26)}
    refs.append(rref(*rp[n]))
    gp={6:(32,33),7:(1,4),9:(38,41),10:(42,46),11:(47,50),12:(34,37),13:(38,41),14:(42,44),25:(40,41),26:(40,41),29:(44,46),31:(45,46),32:(49,59),33:(35,37),34:(35,37),35:(47,52),36:(53,59)}
    if n in gp: refs.append(gpref(*gp[n]))
    # Laravel deck coverage distributed across relevant sessions, preserving the entire deck across sessions 17-23.
    lp={17:(1,60),18:(60,110),19:(111,145),20:(146,205),21:(213,265),22:(266,342),23:(101,342)}
    if n in lp: refs.append(lref(*lp[n]))
    s={'n':n,'part':part,'title':title,'description':f'Sesi ini menggabungkan materi {", ".join(ch_titles(a,b))} menjadi alur belajar tiga jam dengan format Pahami → Ketik ulang → Modifikasi → Hands-on → Uji → Refleksi.','objectives':[f'Memahami {title.lower()} sebagai bagian dari jalur full-stack.', 'Mampu menjelaskan konsep inti dengan kata sendiri dan menghubungkannya ke project.', 'Mampu mempraktikkan contoh, memodifikasi requirement, dan menguji kasus gagal.'],'practice':practices(a,b) or [f'Kerjakan latihan pada Bab {a}–{b} tanpa copy-paste.', 'Buat satu variasi requirement dan uji edge case.'],'checkpoint':checkpoints(a,b) or ['Bisa menjelaskan konsep tanpa catatan.','Bisa membuat contoh kecil dari nol.','Bisa membaca error dan menguji kasus gagal.'],'sourceRefs':refs}
    sessions.append(s)

# Add exact per-session timeline and common session pedagogy.
exact_agendas={
1:[('00:00–00:05',5,'Pembukaan'),('00:05–00:15',10,'Apa itu pemrograman?'),('00:15–00:30',15,'Algoritma & pseudocode'),('00:30–00:45',15,'Flowchart'),('00:45–01:05',20,'Variabel, tipe data, operator'),('01:05–01:15',10,'Istirahat'),('01:15–01:45',30,'Struktur kontrol'),('01:45–02:00',15,'Fungsi'),('02:00–02:15',15,'Struktur data dasar'),('02:15–02:50',35,'Latihan pemecahan masalah'),('02:50–03:00',10,'Rangkuman & tanya jawab')],
2:[('00:00–00:05',5,'Pembukaan'),('00:05–00:20',15,'Apa itu Go?'),('00:20–00:45',25,'Instalasi & setup'),('00:45–01:00',15,'Struktur proyek & Hello World'),('01:00–01:10',10,'Istirahat'),('01:10–01:30',20,'Variabel & konstanta'),('01:30–01:45',15,'Tipe data dasar'),('01:45–01:55',10,'Operator'),('01:55–02:20',25,'Latihan hands-on'),('02:20–02:55',35,'Soft skill: komunikasi'),('02:55–03:00',5,'Penutup & tugas')],
3:[('00:00–00:10',10,'Pembukaan & review tugas'),('00:10–00:25',15,'Percabangan if-else'),('00:25–00:35',10,'Percabangan switch'),('00:35–00:55',20,'Perulangan for'),('00:55–01:05',10,'Istirahat'),('01:05–01:15',10,'Array'),('01:15–01:30',15,'Slice'),('01:30–01:45',15,'Map'),('01:45–01:55',10,'Struct'),('01:55–02:20',25,'Latihan hands-on'),('02:20–02:55',35,'Soft skill: verbal & non-verbal'),('02:55–03:00',5,'Penutup & tugas')],
}
for s in sessions:
    s['id']=f"sesi-{s['n']:02d}"
    s['chapter']=s['n']
    s['label']=f"Sesi {s['n']:02d}"
    s['partTitle']=next(p['title'] for p in parts if p['id']==s['part'])
    s['estimatedMinutes']=180
    s['difficulty']='dasar' if s['n']<=5 else ('menengah' if s['n']<=26 else 'lanjutan')
    s['agenda']=agenda()
    if s['n'] in exact_agendas:
        s['agenda']=[{'time':t,'minutes':m,'label':label} for t,m,label in exact_agendas[s['n']]]
    s['learningFlow']=['Pahami konsep','Ketik ulang contoh','Modifikasi requirement','Hands-on','Uji kasus normal/batas/gagal','Refleksi dan commit']
    s['communicationFocus']='Jelaskan masalah dengan konteks, hasil yang diharapkan, hasil aktual, langkah yang sudah dicoba, lalu ajukan pertanyaan yang spesifik.'
    s['task']=s['practice'][0] if s['practice'] else 'Kerjakan latihan utama sesi dan simpan hasilnya di Git.'
    s['sourcePages']=[]
    s['prerequisites']=[f'sesi-{s["n"]-1:02d}'] if s['n']>1 else []
    s['slug']=re.sub(r'[^a-z0-9]+','-',s['title'].lower()).strip('-')
    s['url']=f"/belajar/{s['part']}/{s['slug']}/"
    s['tags']=[p['id'] for p in parts if p['id']==s['part']]+[w for w in re.findall(r'[A-Za-z0-9]+',s['title']) if len(w)>=4][:8]
    s['updatedAt']='2026-10-02'
    s['version']='3.0.0'

sessions=sorted(sessions,key=lambda x:x['n'])
(DATA/'sessions.json').write_text(json.dumps(sessions,ensure_ascii=False,indent=2),encoding='utf-8')
(DATA/'lessons.json').write_text(json.dumps(sessions,ensure_ascii=False,indent=2),encoding='utf-8')
(DATA/'catalog.json').write_text(json.dumps(sessions,ensure_ascii=False,indent=2),encoding='utf-8')

# Lightweight explanations aligned to each session, so the existing learning UI can still be used.
exps=[]
for s in sessions:
    exps.append({'id':s['id'],'summary':s['description'],'mentalModel':'Pahami → ketik ulang → modifikasi → uji. Fokus pada alasan setiap langkah, bukan hafalan syntax.','why':'Konsep sesi ini dipakai lagi pada sesi berikutnya dan pada project utama.','bridge':f"Hubungkan {s['title'].lower()} dengan requirement aplikasi nyata.",'steps':s['learningFlow'],'mistakes':['Copy-paste tanpa memahami bentuk dan alasan.','Mengubah banyak hal sekaligus saat debugging.'],'check':s['checkpoint'][:3]})
(DATA/'explanations.json').write_text(json.dumps(exps,ensure_ascii=False,indent=2),encoding='utf-8')

# 26 weeks now point to sessions instead of the retired 8-week Go track.
weeks=[]
focus=[
('Fondasi & logika','Sesi 1–2 + latihan algoritma'),('Go kontrol & data','Sesi 3–5 + CLI mini apps'),('Terminal, Git, PHP','Sesi 6–7 + repository latihan'),('OOP, HTML, CSS','Sesi 8–9 + responsive page'),('JavaScript & browser','Sesi 10–11 + interactive UI'),('HTTP & accessibility','Sesi 12–13 + audit UI/API'),('SQL & PDO','Sesi 14–15 + mini blog'),('Composer & Laravel','Sesi 16–17 + CRUD dasar'),('Arsitektur Laravel','Sesi 18 + refactor kecil'),('Tooling & TypeScript','Sesi 19 + 24 latihan TS'),('Vue 3','Sesi 25 + mini dashboard'),('Inertia & state','Sesi 26 + full-stack module'),('Testing','Sesi 27 + regression tests'),('Security','Sesi 28 + threat model'),('Performance & observability','Sesi 29 + measured fix'),('Linux & web server','Sesi 30 + staging lab'),('Deployment','Sesi 31 + rollback checklist'),('Docker & CI/CD','Sesi 31 + pipeline'),('Backup & recovery','Sesi 32 + restore drill'),('Go specialization','Sesi 33 + concurrency lab'),('Backend Go','Sesi 34 + API/DB'),('Project foundation','Sesi 35 + scope & ADR'),('Project quality','Sesi 35 + test/security/refactor'),('Digital-era engineering','Sesi 36 + AI/supply-chain/privacy'),('Portfolio & career','Sesi 36 + case study'),('Final checkpoint','Sesi 1–36 review + project release')]
for i,(f,o) in enumerate(focus,1): weeks.append({'number':i,'focus':f,'output':o})
(DATA/'fullstack-weeks.json').write_text(json.dumps(weeks,ensure_ascii=False,indent=2),encoding='utf-8')
(DATA/'weeks.json').write_text(json.dumps([{'number':w['number'],'title':w['focus'],'output':w['output'],'lessons':[min(36,(w['number']+1)),min(36,(w['number']+2))],'checklist':['Pahami konsep','Ketik ulang contoh','Modifikasi requirement','Uji kasus gagal','Simpan hasil di Git']} for w in weeks],ensure_ascii=False,indent=2),encoding='utf-8')

# Keep project/portal feature data, but detach old lesson numbering from UI semantics by leaving the project content itself intact.
# Update quizzes to session-oriented groupings while keeping the existing component contract.
quiz_defs=[
 ('fondasi','Fondasi & Go',['Input → Process → Output adalah pola dasar program.','go mod init membuat root module.','if, switch, for, slice, map, function, struct adalah fondasi Go.']),
 ('web','Web Fundamental',['Git menyimpan history.','HTTP memakai request/response dan status code.','DOM/DevTools membantu inspeksi perilaku browser.']),
 ('data','SQL & Data',['Primary key mengidentifikasi row.','Foreign key menghubungkan table.','Transaction mengelompokkan operasi commit/rollback.']),
 ('laravel','Laravel',['Routing memetakan request.','Controller mengorkestrasi request-response.','Middleware menangani cross-cutting concern.']),
 ('frontend','TypeScript & Vue',['Vue bersifat reaktif.','TypeScript memperjelas kontrak data.','State perlu dibedakan local/shared/server.']),
 ('quality','Testing & Security',['Regression test mencegah bug kembali.','Authorization berbeda dari authentication.','Input harus divalidasi di server.']),
 ('production','Production',['Container mengisolasi service.','Backup perlu diuji restore.','Observability membantu diagnosis.']),
 ('go-backend','Go Backend',['Handler menangani HTTP request/response.','Service berisi aturan bisnis.','Repository menangani akses data.']),
 ('project','Project & Portfolio',['README menjelaskan problem, setup, testing, deployment.','Trade-off dan keputusan perlu didokumentasikan.','Secret tidak boleh masuk repository.']),
 ('digital','AI, Privacy & Supply Chain',['AI digunakan sebagai alat bantu yang tetap harus diverifikasi.','Dependency hygiene mengurangi supply-chain risk.','Privacy dimulai dari data minimization.'])]
quizzes=[]
for qid,title,qs in quiz_defs:
    q=[]
    for i,statement in enumerate(qs,1):
        opts=[statement,'Pilih framework sebelum memahami requirement.','Lewati pengujian agar proses lebih cepat.']
        q.append({'id':f'{qid}-{i}','question':f'Pernyataan yang tepat tentang {title.lower()} adalah…','options':opts,'answer':0,'explanations':['Benar sesuai materi sumber dan alur belajar.','Tidak sesuai prinsip pembelajaran pada materi.','Tidak sesuai prinsip pembelajaran pada materi.'],'url':sessions[(i-1)%len(sessions)]['url']})
    quizzes.append({'id':qid,'title':title,'questions':q})
(DATA/'quizzes.json').write_text(json.dumps(quizzes,ensure_ascii=False,indent=2),encoding='utf-8')

# Preserve old project tracks but update navigation-facing copy in portal data only if needed; data itself is not curriculum.
print('source docs:', [(x['id'],x['unitCount']) for x in source_library])
print('total source units:', sum(x['unitCount'] for x in source_library))
print('sessions:',len(sessions))
print('book chapters:',len(book_chapters))
print('weeks:',len(weeks))
