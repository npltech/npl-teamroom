import { useCallback, useEffect, useState } from 'react';

export type HolidayCategory = 'National Holiday' | 'Optional Holiday' | 'Company Holiday' | 'Announcement';

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  category: HolidayCategory;
}

const STORAGE_KEY = 'roster.holidays';

const SEED_HOLIDAYS: Holiday[] = [
  { id: 'h1', date: '2026-08-15', name: 'Independence Day', category: 'National Holiday' },
  { id: 'h2', date: '2026-10-02', name: 'Gandhi Jayanti', category: 'National Holiday' },
  { id: 'h3', date: '2026-11-08', name: 'Diwali', category: 'National Holiday' },
  { id: 'h4', date: '2026-12-25', name: 'Christmas', category: 'National Holiday' },
  { id: 'h5', date: '2026-09-04', name: 'Founders\u2019 Day', category: 'Company Holiday' },
];

function loadHolidays(): Holiday[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_HOLIDAYS));
      return SEED_HOLIDAYS;
    }
    return JSON.parse(raw) as Holiday[];
  } catch {
    return SEED_HOLIDAYS;
  }
}

export function useHolidays() {
  const [holidays, setHolidays] = useState<Holiday[]>(() => loadHolidays());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(holidays));
  }, [holidays]);

  const addHoliday = useCallback((h: Omit<Holiday, 'id'>) => {
    setHolidays((prev) =>
      [...prev, { ...h, id: crypto.randomUUID() }].sort((a, b) => a.date.localeCompare(b.date)),
    );
  }, []);

  const removeHoliday = useCallback((id: string) => {
    setHolidays((prev) => prev.filter((h) => h.id !== id));
  }, []);

  return { holidays: [...holidays].sort((a, b) => a.date.localeCompare(b.date)), addHoliday, removeHoliday };
}

export function upcomingHolidays(holidays: Holiday[], from = new Date(), limit = 4): Holiday[] {
  const today = from.toISOString().slice(0, 10);
  return holidays.filter((h) => h.date >= today).slice(0, limit);
}

export function formatHolidayDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', weekday: 'short' });
}
