import { useCallback, useEffect, useState } from 'react';

export type HolidayCategory = 'National Holiday' | 'Optional Holiday' | 'Company Holiday' | 'Announcement';

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  category: HolidayCategory;
  description?: string | null;
  image?: string | null;
}

export function getEventPlaceholderImage(name: string, category?: string): string {
  const haystack = `${category ?? ''} ${name}`.toLowerCase();
  let glyph = '🎉';
  let background = '#EEF2FF';
  let foreground = '#4338CA';

  if (haystack.includes('birthday') || haystack.includes('cake')) {
    glyph = '🎂';
    background = '#FDE7F3';
    foreground = '#BE185D';
  } else if (haystack.includes('new year') || haystack.includes('new-year') || haystack.includes('firework')) {
    glyph = '🎆';
    background = '#FFF7ED';
    foreground = '#C2410C';
  } else if (haystack.includes('anniversary') || haystack.includes('milestone')) {
    glyph = '🏆';
    background = '#F5F3FF';
    foreground = '#6D28D9';
  } else if (
    haystack.includes('independence') ||
    haystack.includes('christmas') ||
    haystack.includes('diwali') ||
    haystack.includes('holiday') ||
    haystack.includes('festival')
  ) {
    glyph = '🎊';
    background = '#ECFDF5';
    foreground = '#047857';
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120" role="img" aria-label="${name}">
      <rect width="120" height="120" rx="24" fill="${background}"/>
      <circle cx="92" cy="28" r="10" fill="${foreground}" opacity="0.2"/>
      <circle cx="30" cy="92" r="12" fill="${foreground}" opacity="0.12"/>
      <text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle" font-size="52">${glyph}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function resolveEventImage(image: string | null | undefined, name: string, category?: string): string {
  return image || getEventPlaceholderImage(name, category);
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

  const updateHoliday = useCallback((id: string, changes: Partial<Omit<Holiday, 'id'>>) => {
    setHolidays((prev) =>
      prev
        .map((holiday) => (holiday.id === id ? { ...holiday, ...changes } : holiday))
        .sort((a, b) => a.date.localeCompare(b.date)),
    );
  }, []);

  const removeHoliday = useCallback((id: string) => {
    setHolidays((prev) => prev.filter((h) => h.id !== id));
  }, []);

  return { holidays: [...holidays].sort((a, b) => a.date.localeCompare(b.date)), addHoliday, updateHoliday, removeHoliday };
}

export function upcomingHolidays(holidays: Holiday[], from = new Date(), limit = 4): Holiday[] {
  const today = from.toISOString().slice(0, 10);
  return holidays.filter((h) => h.date >= today).slice(0, limit);
}

export function formatHolidayDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', weekday: 'short' });
}
