import { useMemo } from 'react';
import type { Employee } from './employees';

export interface CompanyEvent {
  id: string;
  date: string; // YYYY-MM-DD (this year)
  title: string;
  kind: 'announcement' | 'anniversary' | 'birthday';
  description?: string | null;
  image?: string | null;
}

function daysAhead(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const SEED_EVENTS: Omit<CompanyEvent, 'id'>[] = [
  { date: daysAhead(3), title: 'All-hands town hall', kind: 'announcement' },
  { date: daysAhead(9), title: 'Q3 planning kickoff', kind: 'announcement' },
];

/** Work anniversaries computed from each employee's joining_date, projected onto this year. */
function anniversariesFrom(employees: Employee[]): CompanyEvent[] {
  const today = new Date();
  const thisYear = today.getFullYear();
  return employees
    .map((e): CompanyEvent | null => {
      const joined = new Date(e.joining_date + 'T00:00:00');
      const years = thisYear - joined.getFullYear();
      if (years <= 0) return null;
      const anniversary = new Date(thisYear, joined.getMonth(), joined.getDate());
      return {
        id: `anniv-${e.id}`,
        date: anniversary.toISOString().slice(0, 10),
        title: `${e.name}'s ${years}-year work anniversary`,
        kind: 'anniversary',
      };
    })
    .filter((x): x is CompanyEvent => x !== null);
}

function birthdaysFrom(employees: Employee[]): CompanyEvent[] {
  const today = new Date();
  const thisYear = today.getFullYear();
  return employees
    .map((e): CompanyEvent | null => {
      if (!e.date_of_birth) return null;
      const dob = new Date(e.date_of_birth + 'T00:00:00');
      const birthday = new Date(thisYear, dob.getMonth(), dob.getDate());
      return {
        id: `birthday-${e.id}`,
        date: birthday.toISOString().slice(0, 10),
        title: `${e.name}'s birthday`,
        kind: 'birthday',
      };
    })
    .filter((x): x is CompanyEvent => x !== null);
}

export function useUpcomingEvents(employees: Employee[], limit = 4): CompanyEvent[] {
  return useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const all: CompanyEvent[] = [
      ...SEED_EVENTS.map((e, i) => ({ ...e, id: `seed-${i}` })),
      ...birthdaysFrom(employees),
      ...anniversariesFrom(employees),
    ];
    return all
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, limit);
  }, [employees, limit]);
}
