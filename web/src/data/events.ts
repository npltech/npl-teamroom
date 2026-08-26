import { useMemo } from 'react';
import type { Employee } from './employees';
import { getComputedEmployeeEvents } from './holidays';

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

function anniversariesFrom(employees: Employee[]): CompanyEvent[] {
  return employees.flatMap((employee) => getComputedEmployeeEvents(employee))
    .filter((event) => event.kind === 'Anniversary')
    .map((event) => ({
      id: event.id,
      date: event.date,
      title: event.name,
      kind: 'anniversary',
      description: event.description,
      image: event.image,
    }));
}

function birthdaysFrom(employees: Employee[]): CompanyEvent[] {
  return employees.flatMap((employee) => getComputedEmployeeEvents(employee))
    .filter((event) => event.kind === 'Birthday')
    .map((event) => ({
      id: event.id,
      date: event.date,
      title: event.name,
      kind: 'birthday',
      description: event.description,
      image: event.image,
    }));
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
