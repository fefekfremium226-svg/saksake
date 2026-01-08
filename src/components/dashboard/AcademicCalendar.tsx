import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { getSettings, saveSettings } from '@/lib/storage';
import { Input } from '@/components/ui/input';

const AcademicCalendar = () => {
  const [events, setEvents] = useState<any[]>(() => getSettings().calendar || []);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    saveSettings({ ...getSettings(), calendar: events });
  }, [events]);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Kalender Akademik</h3>
        <Button onClick={() => setOpen(true)}>Tambah Event</Button>
      </div>
      <div className="space-y-2">
        {events.length === 0 && <p className="text-muted-foreground">Belum ada event.</p>}
        {events.map((ev, i) => (
          <div key={i} className="p-2 border rounded">
            <div className="flex justify-between">
              <div>
                <div className="font-medium">{ev.title}</div>
                <div className="text-sm text-muted-foreground">{ev.date}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Event Kalender</DialogTitle>
            <DialogDescription>Masukkan tanggal dan deskripsi event akademik.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget as HTMLFormElement);
            const title = String(fd.get('title') || '');
            const date = String(fd.get('date') || '');
            if (!title || !date) return;
            const next = [...events, { title, date }];
            setEvents(next);
            setOpen(false);
          }}>
            <div className="grid gap-2">
              <Input name="title" placeholder="Judul event" required />
              <Input name="date" placeholder="Tanggal (YYYY-MM-DD)" required />
              <DialogFooter>
                <Button type="submit">Simpan</Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AcademicCalendar;
