import { useEffect, useState } from 'react';
import DashboardLayout from './DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, GraduationCap, BookOpen, FileText, Upload, Search, UserPlus, Settings } from 'lucide-react';
import { allStudents as importedStudents } from '@/data/students';
import { teachers as importedTeachers } from '@/data/teachers';
import { distributeStudentsByJurusan } from '@/lib/classUtils';
import AcademicCalendar from './AcademicCalendar';
import { allSubjects } from '@/data/subjects';
import * as XLSX from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { getStudents, saveStudents, getTeachers, saveTeachers, getSettings, saveSettings, backupStudents, restoreStudentsBackup } from '@/lib/storage';
import { Select } from '@/components/ui/select';

type ActiveMenu = 'overview' | 'students' | 'teachers' | 'subjects' | 'import';

const AdminDashboard = () => {
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [students, setStudents] = useState(importedStudents);
  const [teachersState, setTeachersState] = useState(importedTeachers);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [addTeacherOpen, setAddTeacherOpen] = useState(false);

  const [semester, setSemester] = useState(() => getSettings().semester || 1);

  useEffect(() => {
    const s = getStudents();
    if (s && Array.isArray(s)) setStudents(s);
    const t = getTeachers();
    if (t && Array.isArray(t)) setTeachersState(t);
  }, []);

  useEffect(() => {
    saveSettings({ ...getSettings(), semester });
  }, [semester]);

  const stats = [
    { title: 'Total Siswa', value: students.length, icon: Users, color: 'text-blue-500' },
    { title: 'Total Guru', value: teachersState.length, icon: GraduationCap, color: 'text-green-500' },
    { title: 'Mata Pelajaran', value: allSubjects.length, icon: BookOpen, color: 'text-purple-500' },
    { title: 'Total Kelas', value: 12, icon: FileText, color: 'text-orange-500' },
  ];

  const filteredStudents = students.filter(s => 
    s.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.kelas || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.jurusan || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTeachers = teachersState.filter(t =>
    t.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.mataPelajaran.some(m => m.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [pageSize, filteredStudents.length]);

  const handleImport = () => {
    toast.info('Pilih file CSV untuk import siswa atau guru.');
  };

  // Add Student
  const handleAddStudent = (payload: any) => {
    const next = [...students];
    next.unshift(payload);
    setStudents(next);
    saveStudents(next);
    toast.success('Siswa ditambahkan');
  };

  const handleAddTeacher = (payload: any) => {
    const next = [...teachersState, payload];
    setTeachersState(next);
    saveTeachers(next);
    toast.success('Guru ditambahkan');
  };

  // Distribusi kelas
  const handleDistribusi = (grade: string, jurusanText: string) => {
    const jurusanList = jurusanText.split(',').map(s => s.trim()).filter(Boolean);
    if (!jurusanList.length) return toast.error('Masukkan daftar jurusan, pisahkan dengan koma');
    const updated = distributeStudentsByJurusan(students, grade, jurusanList, 36, 12);
    setStudents(updated);
    saveStudents(updated);
    toast.success('Distribusi kelas selesai');
  };

  const exportCSV = (type: 'students' | 'teachers') => {
    const rows = type === 'students' ? students : teachersState;
    if (!rows.length) return toast.error('Data kosong');
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(',')].concat(rows.map(r => keys.map(k => `"${String(r[k] ?? '')}"`).join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCSV = async (file: File, type: 'students' | 'teachers') => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const parsed = lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.replace(/"/g, '').trim());
      const obj: any = {};
      headers.forEach((h, i) => obj[h] = cols[i] ?? '');
      return obj;
    });
    if (type === 'students') {
      const next = [...parsed, ...students];
      setStudents(next);
      saveStudents(next);
      toast.success('Import siswa selesai');
    } else {
      const next = [...teachersState, ...parsed];
      setTeachersState(next);
      saveTeachers(next);
      toast.success('Import guru selesai');
    }
  };

  const importXLSX = async (file: File, type: 'students' | 'teachers' | 'both') => {
    try {
      const ab = await file.arrayBuffer();
      const workbook = XLSX.read(ab, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      if (type === 'students' || type === 'both') {
        const mapped = json.map(r => ({
          id: r.id || r.ID || `S${Math.floor(Math.random()*100000)}`,
          nama: r.nama || r.NAMA || r.name || '',
          jurusan: r.jurusan || r.JURUSAN || r.major || '',
          kelas: r.kelas || r.KELAS || r.class || '',
          tahunMasuk: Number(r.tahunMasuk || r.TAHUN || r.year || new Date().getFullYear()),
          email: r.email || r.EMAIL || '',
          password: r.password || r.PASSWORD || ''
        }));
        const next = [...mapped, ...students];
        setStudents(next);
        saveStudents(next);
        toast.success('Import XLSX siswa selesai');
      }
      if (type === 'teachers' || type === 'both') {
        const mapped = json.map(r => ({
          id: r.id || r.ID || `T${Math.floor(Math.random()*100000)}`,
          nama: r.nama || r.NAMA || r.name || '',
          nip: r.nip || r.NIP || '',
          kategori: r.kategori || r.KATEGORI || 'Umum',
          mataPelajaran: (r.mataPelajaran || r.MATA_PELAJARAN || r.mapel || '').toString().split(',').map((s: string) => s.trim()).filter(Boolean)
        }));
        const next = [...teachersState, ...mapped];
        setTeachersState(next);
        saveTeachers(next);
        toast.success('Import XLSX guru selesai');
      }
    } catch (e) {
      toast.error('Gagal membaca file XLSX');
    }
  };

  // --- Column mapping flow ---
  const [mappingOpen, setMappingOpen] = useState(false);
  const [mappingHeaders, setMappingHeaders] = useState<string[]>([]);
  const [mappingType, setMappingType] = useState<'students'|'teachers'|'both'>('students');
  const [rawCsvText, setRawCsvText] = useState<string | null>(null);
  const [sheetRows, setSheetRows] = useState<any[] | null>(null);
  const [previewRows, setPreviewRows] = useState<string[][] | null>(null);
  const studentFields = ['ignore','id','nama','jurusan','kelas','tahunMasuk','email','password','nilaiAverage'];
  const teacherFields = ['ignore','id','nama','nip','kategori','mataPelajaran'];
  const [fieldMap, setFieldMap] = useState<Record<string,string>>({});

  const normalizeHeader = (h: string) => String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const suggestFieldForHeader = (hdr: string, type: typeof mappingType) => {
    const n = normalizeHeader(hdr);
    // common suggestions
    if (/name|nama|fullname|full/.test(n)) return 'nama';
    if (/id|nis|no|number/.test(n)) return 'id';
    if (/jurusan|major|department/.test(n)) return 'jurusan';
    if (/kelas|class/.test(n)) return 'kelas';
    if (/tahun|year|tahunmasuk/.test(n)) return 'tahunMasuk';
    if (/email/.test(n)) return 'email';
    if (/password|pass/.test(n)) return 'password';
    if (/nilai|score|avg|average/.test(n)) return 'nilaiAverage';
    if (type === 'teachers') {
      if (/nip/.test(n)) return 'nip';
      if (/kategori|category|type/.test(n)) return 'kategori';
      if (/mapel|mata|subject/.test(n)) return 'mataPelajaran';
    }
    // fallback
    return 'ignore';
  };

  const downloadTemplate = (type: 'students'|'teachers'|'both') => {
    let headers: string[] = [];
    let sample: string[] = [];
    if (type === 'students' || type === 'both') {
      headers = ['id','nama','jurusan','kelas','tahunMasuk','email','password','nilaiAverage'];
      sample = ['S0001','Azzhara','TKJ','XII TKJ A','2022','azzhara@example.com','azzhara123','88'];
    }
    if (type === 'teachers' || type === 'both') {
      if (!headers.length) headers = ['id','nama','nip','kategori','mataPelajaran'];
      sample = ['G0001','Budi','19800101','Umum','Matematika,IPA'];
    }
    const csv = [headers.join(','), sample.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${type}_template.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const handleFileForImport = async (file: File, type: 'students'|'teachers'|'both') => {
    setMappingType(type);
    if (file.name.toLowerCase().endsWith('.csv')) {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      const headers = lines[0].split(',').map(h => h.replace(/"/g,'').trim());
      setMappingHeaders(headers);
      setRawCsvText(text);
      const parsedRows = lines.slice(1).map(l => l.split(','));
      setSheetRows(parsedRows);
      setPreviewRows(parsedRows.slice(0,5));
      // auto-suggest mapping
      const initial: Record<string,string> = {};
      headers.forEach(h => { initial[h] = suggestFieldForHeader(h, type === 'both' ? 'students' : type as any); });
      setFieldMap(initial);
      setMappingOpen(true);
    } else {
      try {
        const ab = await file.arrayBuffer();
        const workbook = XLSX.read(ab, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const aoa = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' }) as any[];
        if (!aoa || aoa.length === 0) return toast.error('Sheet kosong');
        const headers = (aoa[0] || []).map((h: any) => String(h).trim());
        setMappingHeaders(headers);
        const rows = aoa.slice(1) as any[];
        setSheetRows(rows);
        setPreviewRows(rows.slice(0,5));
        const initial: Record<string,string> = {};
        headers.forEach(h => { initial[h] = suggestFieldForHeader(h, type === 'both' ? 'students' : type as any); });
        setFieldMap(initial);
        setMappingOpen(true);
      } catch (e) {
        toast.error('Gagal membaca file');
      }
    }
  };

  const applyMappingAndImport = () => {
    // backup current state so import can be undone
    try { backupStudents(students); } catch (e) { /* ignore */ }
    if (mappingType === 'students') {
      const baseRows = rawCsvText ? rawCsvText.split(/\r?\n/).filter(Boolean).slice(1).map(r => r.split(',')) : (sheetRows || []);
      const rows = [...baseRows];
      if (previewRows && previewRows.length) {
        for (let i = 0; i < previewRows.length; i++) rows[i] = previewRows[i];
      }
      const mapped = rows.map((row: any[]) => {
        const obj: any = {};
        mappingHeaders.forEach((hdr, i) => {
          const field = fieldMap[hdr];
          if (!field || field === 'ignore') return;
          const val = (row[i] ?? '') + '';
          if (field === 'tahunMasuk' || field === 'nilaiAverage') obj[field] = Number(val) || 0;
          else obj[field] = val;
        });
        if (!obj.id) obj.id = `S${Math.floor(Math.random()*100000)}`;
        return obj;
      });
      const next = [...mapped, ...students];
      setStudents(next); saveStudents(next); toast.success('Import siswa selesai');
    }
    if (mappingType === 'teachers') {
        const baseRows = rawCsvText ? rawCsvText.split(/\r?\n/).filter(Boolean).slice(1).map(r => r.split(',')) : (sheetRows || []);
        const rows = [...baseRows];
        if (previewRows && previewRows.length) {
          for (let i = 0; i < previewRows.length; i++) rows[i] = previewRows[i];
        }
      const mapped = rows.map((row: any[]) => {
        const obj: any = {};
        mappingHeaders.forEach((hdr, i) => {
          const field = fieldMap[hdr];
          if (!field || field === 'ignore') return;
          const val = (row[i] ?? '') + '';
          if (field === 'mataPelajaran') obj[field] = val.split(',').map((s:string)=>s.trim()).filter(Boolean);
          else obj[field] = val;
        });
        if (!obj.id) obj.id = `T${Math.floor(Math.random()*100000)}`;
        return obj;
      });
      const next = [...teachersState, ...mapped];
      setTeachersState(next); saveTeachers(next); toast.success('Import guru selesai');
    }
    setMappingOpen(false); setRawCsvText(null); setSheetRows(null); setMappingHeaders([]); setPreviewRows(null); setFieldMap({});
  };

  const undoLastImport = () => {
    const b = restoreStudentsBackup();
    if (!b) return toast.error('Tidak ada backup import terakhir');
    setStudents(b);
    saveStudents(b);
    toast.success('Rollback import berhasil');
  };

  const generateEligible = (threshold = 80, quota = 10) => {
    // use `nilaiAverage` if present on student objects
    const kelas12 = students.filter(s => String(s.kelas || '').startsWith('XII') || String(s.kelas || '').startsWith('12'));
    const withScore = kelas12.map(s => ({ ...s, nilaiAverage: Number(s.nilaiAverage ?? 0) }));
    const eligible = withScore.filter(s => s.nilaiAverage >= threshold).sort((a,b) => b.nilaiAverage - a.nilaiAverage).slice(0, quota);
    return eligible;
  };

  const [eligibleOpen, setEligibleOpen] = useState(false);
  const [eligibleList, setEligibleList] = useState<any[]>([]);
  const [eligibleThreshold, setEligibleThreshold] = useState(80);
  const [eligibleQuota, setEligibleQuota] = useState(10);

  const openEligible = () => {
    const list = generateEligible(eligibleThreshold, eligibleQuota);
    setEligibleList(list);
    setEligibleOpen(true);
  };

  const exportEligibleCSV = () => {
    if (!eligibleList.length) return toast.error('Daftar eligible kosong');
    const keys = ['no','id','nama','kelas','jurusan','nilaiAverage'];
    const csv = [keys.join(',')].concat(eligibleList.map((s,i) => [i+1,s.id,s.nama,s.kelas||'',s.jurusan||'',s.nilaiAverage||''].map(v=>`"${String(v)}"`).join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'eligible.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const printEligible = () => {
    const html = `<html><head><title>Daftar Eligible</title><style>@page{size:A4;margin:20mm}body{font-family:Arial}</style></head><body><h1>Daftar Siswa Eligible</h1><ol>${eligibleList.map(s=>`<li>${s.nama} - ${s.kelas || ''} - ${s.nilaiAverage || ''}</li>`).join('')}</ol></body></html>`;
    const w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
  };

  const sidebar = (
    <nav className="space-y-1">
      {[
        { id: 'overview', label: 'Ringkasan', icon: Settings },
        { id: 'students', label: 'Data Siswa', icon: Users },
        { id: 'teachers', label: 'Data Guru', icon: GraduationCap },
        { id: 'subjects', label: 'Mata Pelajaran', icon: BookOpen },
        { id: 'import', label: 'Import Data', icon: Upload },
      ].map((item) => (
        <Button
          key={item.id}
          variant={activeMenu === item.id ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => setActiveMenu(item.id as ActiveMenu)}
        >
          <item.icon className="w-4 h-4 mr-2" />
          {item.label}
        </Button>
      ))}
    </nav>
  );

  return (
    <DashboardLayout title="Dashboard Admin" sidebar={sidebar}>
      {activeMenu === 'overview' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Selamat Datang, Administrator</h2>
            <p className="text-muted-foreground">Kelola data siswa, guru, dan raport sekolah</p>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input type="number" value={eligibleThreshold} onChange={(e) => setEligibleThreshold(Number(e.target.value))} className="w-24" />
              <Input type="number" value={eligibleQuota} onChange={(e) => setEligibleQuota(Number(e.target.value))} className="w-24" />
              <Button onClick={openEligible}>Generate Eligible</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <Card key={stat.title}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-3xl font-bold">{stat.value}</p>
                    </div>
                    <stat.icon className={`w-10 h-10 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Aksi Cepat</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button onClick={() => setActiveMenu('students')}>
                <UserPlus className="w-4 h-4 mr-2" />
                Tambah Siswa
              </Button>
              <Button variant="outline" onClick={() => setActiveMenu('teachers')}>
                <GraduationCap className="w-4 h-4 mr-2" />
                Kelola Guru
              </Button>
              <Button variant="outline" onClick={() => setActiveMenu('import')}>
                <Upload className="w-4 h-4 mr-2" />
                Import Data
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {activeMenu === 'students' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Data Siswa</h2>
              <p className="text-muted-foreground">Total: {students.length} siswa</p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                {!isSearchFocused && !searchTerm && (
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                )}
                <Input
                  placeholder="Cari siswa..."
                  className="pl-10 w-64"
                  value={searchTerm}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setPage(1); }}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                />
                {searchTerm && (
                  <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setSearchTerm('')}>
                    ✕
                  </Button>
                )}
              </div>
              <Button onClick={() => setAddStudentOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Tambah
              </Button>
              <Button variant="outline" onClick={() => {
                // generate accounts for students missing email/password
                const next = students.map(s => {
                  const nama = (s.nama || '').trim();
                  const first = nama.split(' ')[0]?.toLowerCase() || 'user';
                  return { ...s, email: s.email || `${first}@gmail.com`, password: s.password || `${first}123` };
                });
                setStudents(next);
                saveStudents(next);
                toast.success('Akun siswa terbuat untuk data yang belum lengkap');
              }}>Buat Akun</Button>
              <Button variant="outline" onClick={() => {
                const grade = prompt('Pilih tingkat (X, XI, XII)') || 'XII';
                const jurusan = prompt('Masukkan jurusan dipisah koma, contoh: TKJ, TKR') || '';
                handleDistribusi(grade, jurusan);
              }}>
                Distribusi Kelas
              </Button>
              <Button variant="ghost" onClick={() => {
                // export all students as A4 printable HTML
                const html = `
                  <html><head><title>Raport Semua Siswa</title>
                  <style>@page{size:A4;margin:20mm}@media print{body{font-family:Arial}}</style>
                  </head><body>
                  <h1>Daftar Siswa</h1>
                  <table border="1" width="100%" cellpadding="4" cellspacing="0">
                  <thead><tr><th>No</th><th>Nama</th><th>Kelas</th><th>Jurusan</th><th>Email</th></tr></thead>
                  <tbody>${students.map((s,i)=>`<tr><td>${i+1}</td><td>${s.nama}</td><td>${s.kelas||''}</td><td>${s.jurusan||''}</td><td>${s.email||''}</td></tr>`).join('')}</tbody>
                  </table></body></html>`;
                const w = window.open('', '_blank');
                if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
              }}>Cetak Raport A4</Button>
              <Dialog open={addStudentOpen} onOpenChange={setAddStudentOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tambah Siswa</DialogTitle>
                    <DialogDescription>Masukkan data siswa baru. Email/username akan dibuat otomatis jika kosong.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget as HTMLFormElement);
                    const nama = String(fd.get('nama') || '').trim();
                    const jurusan = String(fd.get('jurusan') || '').trim();
                    const kelas = String(fd.get('kelas') || '').trim();
                    const tahun = Number(fd.get('tahun') || new Date().getFullYear());
                    const first = nama.split(' ')[0]?.toLowerCase() || 'user';
                    const email = String(fd.get('email') || `${first}@gmail.com`);
                    const password = String(fd.get('password') || `${first}123`);
                    const id = `${jurusan}${String(tahun).slice(-2)}-${Math.floor(Math.random()*900+100)}`;
                    handleAddStudent({ id, nama, jurusan, kelas, tahunMasuk: tahun, email, password });
                    setAddStudentOpen(false);
                  }}>
                    <div className="grid gap-2">
                      <Input name="nama" placeholder="Nama lengkap" required />
                      <Input name="jurusan" placeholder="Jurusan (contoh: TKJ)" required />
                      <Input name="kelas" placeholder="Kelas (contoh: XII TKJ A)" required />
                      <Input name="tahun" placeholder="Tahun masuk" defaultValue={2022} />
                      <Input name="email" placeholder="Email (optional)" />
                      <Input name="password" placeholder="Password (optional)" />
                      <DialogFooter>
                        <Button type="submit">Tambah</Button>
                      </DialogFooter>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Dialog open={eligibleOpen} onOpenChange={setEligibleOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Daftar Eligible</DialogTitle>
                <DialogDescription>Daftar siswa eligible berdasarkan threshold dan kuota.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                {eligibleList.length === 0 && <p className="text-muted-foreground">Belum ada data. Tekan Generate Eligible terlebih dahulu.</p>}
                {eligibleList.length > 0 && (
                  <div>
                    <ol className="list-decimal list-inside">
                      {eligibleList.map((s,i) => <li key={s.id}>{s.nama} — {s.kelas || ''} — {s.nilaiAverage}</li>)}
                    </ol>
                    <div className="flex gap-2 mt-3">
                      <Button onClick={exportEligibleCSV}>Ekspor CSV</Button>
                      <Button variant="outline" onClick={printEligible}>Cetak</Button>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead>Jurusan</TableHead>
                      <TableHead>Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.slice((page - 1) * pageSize, page * pageSize).map((student, idx) => (
                      <TableRow key={student.id}>
                        <TableCell>{(page - 1) * pageSize + idx + 1}</TableCell>
                        <TableCell className="font-medium">{student.nama}</TableCell>
                        <TableCell>{student.kelas}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{student.jurusan}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{student.email}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Tampilkan</span>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="border rounded p-1">
                {[25,50,75,100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-sm text-muted-foreground">per halaman</span>
            </div>

            <div className="flex items-center gap-2">
              <Button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</Button>
              <span className="text-sm">Halaman {page} / {totalPages}</span>
              <Button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
            </div>
          </div>
        </div>
      )}

      {activeMenu === 'teachers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Data Guru</h2>
              <p className="text-muted-foreground">Total: {teachers.length} guru</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari guru..."
                className="pl-10 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="flex gap-2 ml-4">
                <Button onClick={() => setAddTeacherOpen(true)}>Tambah Guru</Button>
                <Dialog open={addTeacherOpen} onOpenChange={setAddTeacherOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Tambah Guru</DialogTitle>
                      <DialogDescription>Isi data guru baru, pilih kategori Umum atau Praktik.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget as HTMLFormElement);
                      const nama = String(fd.get('nama') || '').trim();
                      const nip = String(fd.get('nip') || '').trim();
                      const kategori = String(fd.get('kategori') || 'Umum');
                      const mapel = String(fd.get('mapel') || '').split(',').map(s => s.trim()).filter(Boolean);
                      const id = `G${Math.floor(Math.random()*90000+10000)}`;
                      handleAddTeacher({ id, nama, nip, kategori, mataPelajaran: mapel });
                      setAddTeacherOpen(false);
                    }}>
                      <div className="grid gap-2">
                        <Input name="nama" placeholder="Nama lengkap" required />
                        <Input name="nip" placeholder="NIP (opsional)" />
                        <Select name="kategori">
                          <option value="Umum">Umum</option>
                          <option value="Praktik">Praktik</option>
                        </Select>
                        <Input name="mapel" placeholder="Mata pelajaran (pisah koma)" />
                        <DialogFooter>
                          <Button type="submit">Tambah</Button>
                        </DialogFooter>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTeachers.map((teacher) => (
              <Card key={teacher.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{teacher.nama}</h3>
                      <p className="text-sm text-muted-foreground">{teacher.nip}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {teacher.mataPelajaran.map((mapel) => (
                          <Badge key={mapel} variant="outline" className="text-xs">
                            {mapel}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeMenu === 'subjects' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Mata Pelajaran</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allSubjects.map((subject) => (
              <Card key={subject.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge variant={subject.kategori === 'Umum' ? 'default' : 'secondary'} className="mb-2">
                        {subject.kategori}
                      </Badge>
                      <h3 className="font-semibold">{subject.nama}</h3>
                      <p className="text-sm text-muted-foreground">Kode: {subject.kode}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">KKM: {subject.kkm}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeMenu === 'import' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Import Data</h2>
          <Card>
            <CardHeader>
              <CardTitle>Upload File</CardTitle>
              <CardDescription>
                Import data siswa atau guru dari file CSV/XLSX
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Pilih file CSV atau XLSX untuk import.</p>
                <div className="flex items-center justify-center gap-2">
                    <select id="importType" defaultValue="students" className="border rounded p-1">
                    <option value="students">Siswa</option>
                    <option value="teachers">Guru</option>
                    <option value="both">Keduanya</option>
                  </select>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const type = (document.getElementById('importType') as HTMLSelectElement).value as 'students' | 'teachers' | 'both';
                        handleFileForImport(file, type);
                        (e.target as HTMLInputElement).value = '';
                      }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-4">Format yang didukung: CSV, XLSX, XLS</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

        <Dialog open={mappingOpen} onOpenChange={setMappingOpen}>
          <DialogContent>
              <DialogHeader>
                <DialogTitle>Map Kolom Untuk Import ({mappingType})</DialogTitle>
                <DialogDescription>Pilih kolom mana di file yang dipetakan ke field sistem. Pilih "ignore" untuk kolom yang tidak ingin diimpor.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                {mappingHeaders.map((hdr) => (
                  <div key={hdr} className="flex items-center gap-2">
                    <div className="w-48 text-sm">{hdr}</div>
                    <select value={fieldMap[hdr] || 'ignore'} onChange={(e)=> setFieldMap(m => ({ ...m, [hdr]: e.target.value }))} className="border rounded p-1">
                      {(mappingType === 'students' ? studentFields : teacherFields).map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                ))}

                <div className="mt-2">
                  <h4 className="text-sm font-medium">Preview (5 baris pertama)</h4>
                  <div className="overflow-auto border rounded p-2 max-h-48">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          {(Object.values(fieldMap).filter(Boolean).length > 0 ? Object.values(fieldMap).filter(v => v !== 'ignore') : ['preview']).map(h => (
                            <th key={h} className="text-left pr-2">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const rows = rawCsvText ? rawCsvText.split(/\r?\n/).filter(Boolean).slice(1,6).map(r => r.split(',')) : (sheetRows || []).slice(0,5);
                          if (!rows || rows.length === 0) return <tr><td className="text-muted-foreground">Tidak ada baris untuk preview</td></tr>;
                          return rows.map((row:any[], i:number) => {
                            const mapped: any = {};
                            mappingHeaders.forEach((hdr, idx) => {
                              const field = fieldMap[hdr];
                              if (!field || field === 'ignore') return;
                              mapped[field] = row[idx] ?? '';
                            });
                            const cols = Object.keys(mapped).length ? Object.keys(mapped) : ['_raw'];
                            return (
                              <tr key={i}>
                                {cols.map(c => {
                                  const val = mapped[c] ?? (row.join(', '));
                                  const isMissingRequired = (c === 'nama') && (!val || String(val).trim() === '');
                                  return <td key={c} className={`pr-2 ${isMissingRequired ? 'bg-red-100 text-red-800' : ''}`}>{val}</td>;
                                })}
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex gap-2 mt-2">
                  <Button onClick={() => downloadTemplate(mappingType)}>Download Template</Button>
                  <Button variant="outline" onClick={() => setMappingOpen(false)}>Batal</Button>
                  <Button onClick={applyMappingAndImport} disabled={mappingType === 'students' ? !Object.values(fieldMap).includes('nama') : !Object.values(fieldMap).includes('nama')}>Import</Button>
                </div>
              </div>
            </DialogContent>
        </Dialog>
    </DashboardLayout>
  );
};

export default AdminDashboard;
