#!/usr/bin/env python3
# Script untuk update data siswa kelas 12 SMK Negeri 1 Ngawen

import re

# Data siswa baru yang disediakan user
data_baru = {
    "DPIB": [
        ("479100420050200", "RAFLI BAKTI KURNIAWAN"),
        ("479100420050007", "LUTHFI CANDIRA IKHSAN"),
        ("479100420050070", "GITA NAESILA AMANDA PUTRI"),
        ("479100420050031", "GISKA HERLISTA"),
        ("479100420050121", "ADE RIZKI RAMADHANI"),
        ("479100420050104", "PUTRA PERDANA"),
        ("479100420050250", "ABRIAN DHISCA PUTRA SAFINO"),
        ("479100420050199", "WILDANI EKA MUSLANA"),
        ("479100420050101", "ANWAR SETIAJI"),
        ("479100420050040", "YOGA FAHMI QOIRUDIN"),
        ("479100420050175", "NAYA PUTRI INTAN MUNINGGAR"),
        ("479100420050339", "DINA DWI RAHAYU"),
        ("479100420050338", "DESTYA DINDA DWIYANTI"),
        ("479100420050329", "EDI INDRAWAN"),
        ("479100420050254", "DINA DWI DAMAYANTI"),
        ("479100420050002", "BAGAS DWI SANTOSO"),
        ("479100420050063", "LINDU AJI PRATAMA"),
        ("479100420050028", "MUSA EDI SANYOTO"),
        ("479100420050049", "FATHAN MUBINA YULIAWAN"),
        ("479100420050076", "RYLA ANDREAN ADI PRATAMA"),
        ("479100420050273", "ILHAM MUHAMMAD RISKI"),
        ("479100420050034", "WAHYU ALDIAWAN"),
        ("479100420050279", "MOH. RASYA SATRIA RAMADHAN"),
        ("479100420050270", "ADRIAN ALIFA PUTRA"),
        ("479100420050097", "NALENDRA ANJASMARA"),
        ("479100420050208", "RAIHAN BAYU TRESNAWAN"),
        ("479100420050258", "ARYA JATI PRAMONO"),
        ("479100420050110", "AHMAD FAUZAN"),
    ],
    "TAB": [
        ("479100420050061", "REGITA EKA FIKRIYA"),
        ("479100420050193", "MUHAMMAD SHAHRIR FIRDAUS"),
        ("479100420050064", "KHOLIFAH SIFA APRIANTI"),
        ("479100420050181", "ADITYA DIMAS DWIHARIYANTO"),
        ("479100420050256", "MUHAMMAD SUWANTORO"),
        ("479100420050249", "IBNU FEBRI ARDHIANTO"),
        ("479100420050018", "DONY ADITYA RAHMADANI"),
        ("479100420050118", "RESHAD BINTANG PAMUNGKAS"),
        ("479100420050144", "IBRAM PUTRA HERDAWAN"),
        ("479100420050332", "RIO GANANG FARENDRA"),
        ("479100420050080", "GADIZA NUR AFIFATUL HAMIDAH"),
        ("479100420050042", "ARIKHAN RENDI ALFARIZKI"),
        ("479100420050248", "ARYA PRADANA PUTRA SETIAWAN"),
        ("479100420050030", "NISA FATHIKHA MARSA SALSABILA"),
        ("479100420050026", "IBNI NOVITA MAHMUDAH"),
        ("479100420050253", "ARJUN PUTRA PAMUNGKAS"),
        ("479100420050004", "JOHAN RIYANTO"),
        ("479100420050322", "RAHMAT KURNIAWAN"),
        ("479100420050081", "RIDWAN ANGGIANO"),
        ("479100420050252", "RIFKY DITO MAULANA"),
        ("479100420050293", "RIFKY ALI FEBRIANTARA"),
        ("479100420050232", "ROBBY ADITYA SURYA PRATAMA"),
        ("479100420050165", "ANISAH PUTRI INDRIYANI"),
        ("479100420050303", "FEBRIAN HABIBI ANWAR"),
        ("479100420050244", "ARFAN MAHESA"),
        ("479100420050184", "IMAM MUSTOFA"),
        ("479100420050315", "YOGA ISMAIL ISTIQOMAH"),
        ("479100420050306", "ICHSAN PUTRA RAHARJO"),
        ("479100420050183", "RIZKA AULIA"),
        ("479100420050133", "AGUNG RIFAI"),
        ("479100420050085", "REIZA ADI PUTRA"),
        ("479100420050083", "ADEVIAN NASRULLOH"),
        ("479100427000700", "REYHAN SUDIPTA"),
        ("479100420050166", "FADLOILU NUR QOMARIYAH ARROYO"),
        ("479100420050282", "CHOKY HARIS ADRIANA"),
        ("479100420050375", "DARMAYUDA SINUNG PRABOWO"),
        ("479100427000690", "ZULFIKAR RASYID IRVANGGA"),
        ("479100420050204", "KHOMSA KHOIRUL SAIFUDDIN"),
        ("479100420050355", "LATIV MAULANA RIFA'I"),
        ("479100420050152", "BAYU TRI ATMAKA"),
        ("479100420050146", "VALENTIENO SURYA MAHARDIKA"),
        ("479100420050295", "GENTA SAPUTRA"),
        ("479100420050291", "NURHIDAYAT"),
        ("479100420050074", "CAKRA HARNADITYA"),
        ("479100420050274", "SEPTIAN PUTRA PRATAMA"),
        ("479100420050220", "DIAN ELVI ROMADHONI"),
        ("479100420050289", "ELLYAS AGASTYA"),
        ("479100420050283", "RIZAL MUNANDAR"),
        ("479100420050119", "ALEXANDER DAVID KUKUH PRASTYO"),
        ("479100420050311", "VEGAS DAVID AFRIAN"),
    ],
}

def generate_student_entry(idx, noreg, nama, jurusan, year):
    """Generate single student entry"""
    jurusan_lower = jurusan.lower()
    nama_email = nama.replace(" ", "").replace(".", "").lower()[:20]
    email = f"{nama_email}.{jurusan_lower}@smkn1ngawen.sch.id"
    password = f"{nama_email}{year}"
    
    entry = f'  {{ id: "{jurusan}{year}-{idx:03d}", noDaftar: "{noreg}", nama: "{nama}", jurusan: "{jurusan}", kelas: "XI {jurusan}", tahunMasuk: {year}, email: "{email}", password: "{password}" }},'
    return entry

# Read original file
with open('/Users/hudamnarf/Downloads/eraport-smkn1ngawen/src/data/students.ts', 'r') as f:
    content = f.read()

# Generate new DPIB2022 with Azzhara kept
print("✓ Memproses DPIB 2022...")
dpib_entries = []
dpib_entries.append('  { id: "DPIB22-001", noDaftar: "479100420050359", nama: "AZZHARA SULISTYA TUNGGA DEWI", jurusan: "DPIB", kelas: "XI DPIB", tahunMasuk: 2022, email: "azzhara.dpib@smkn1ngawen.sch.id", password: "azzhara2022" },')

for idx, (noreg, nama) in enumerate(data_baru["DPIB"], 2):
    entry = generate_student_entry(idx, noreg, nama, "DPIB", 2022)
    dpib_entries.append(entry)

dpib_new = "export const studentsDPIB2022: Student[] = [\n" + "\n".join(dpib_entries) + "\n];"

# Replace DPIB2022 section
pattern = r'export const studentsDPIB2022: Student\[\] = \[.*?\];'
content = re.sub(pattern, dpib_new, content, flags=re.DOTALL)

# Save updated file
with open('/Users/hudamnarf/Downloads/eraport-smkn1ngawen/src/data/students.ts', 'w') as f:
    f.write(content)

print("✓ Update DPIB 2022 berhasil!")
print(f"✓ Total entry DPIB: {len(dpib_entries)}")
