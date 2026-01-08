export const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function distributeStudentsByJurusan(students: any[], gradePrefix: string, jurusanList: string[], maxPerClass = 36, minPerClass = 12) {
  const updated = [...students];
  jurusanList = jurusanList.map(j => j.trim()).filter(Boolean);

  jurusanList.forEach((jurusan) => {
    const pool = updated.filter(s => (s.jurusan || '').toLowerCase() === jurusan.toLowerCase() && String(s.kelas || '').toUpperCase().includes(gradePrefix.toUpperCase()));
    if (!pool.length) return;
    const needed = Math.max(1, Math.ceil(pool.length / maxPerClass));
    const sections: any[][] = Array.from({ length: needed }, () => []);
    pool.forEach((stu, idx) => {
      const sec = idx % needed;
      sections[sec].push(stu);
    });

    // merge small sections into A
    for (let i = sections.length - 1; i >= 0; i--) {
      if (sections[i].length > 0 && sections[i].length < minPerClass && i !== 0) {
        sections[0] = sections[0].concat(sections[i]);
        sections.splice(i, 1);
      }
    }

    // assign kelas names
    sections.forEach((group, i) => {
      const suffix = letters[i] || String(i + 1);
      group.forEach((stu) => {
        const kelasName = `${gradePrefix} ${jurusan} ${suffix}`.trim();
        const idx = updated.findIndex(u => u.id === stu.id);
        if (idx !== -1) updated[idx] = { ...updated[idx], kelas: kelasName };
      });
    });
  });

  return updated;
}
