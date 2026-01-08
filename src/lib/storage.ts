export const STUDENTS_KEY = 'eraport_students_v1';
export const TEACHERS_KEY = 'eraport_teachers_v1';
export const SETTINGS_KEY = 'eraport_settings_v1';

export const getStored = (key: string) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

export const setStored = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // ignore
  }
};

export const getStudents = () => getStored(STUDENTS_KEY);
export const saveStudents = (students: any[]) => setStored(STUDENTS_KEY, students);

export const STUDENTS_BACKUP_KEY = 'eraport_students_backup_v1';
export const TEACHERS_BACKUP_KEY = 'eraport_teachers_backup_v1';

export const backupStudents = (students: any[]) => setStored(STUDENTS_BACKUP_KEY, students);
export const restoreStudentsBackup = () => getStored(STUDENTS_BACKUP_KEY) as any[] | null;

export const getTeachers = () => getStored(TEACHERS_KEY);
export const saveTeachers = (teachers: any[]) => setStored(TEACHERS_KEY, teachers);

export const getSettings = () => getStored(SETTINGS_KEY) || {};
export const saveSettings = (settings: any) => setStored(SETTINGS_KEY, settings);

export const SUBJECTS_KEY = 'eraport_subjects_v1';
export const getSubjects = () => getStored(SUBJECTS_KEY);
export const saveSubjects = (subjects: any[]) => setStored(SUBJECTS_KEY, subjects);
