import { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEmployees } from '../data/employees';
import { formatHolidayDate, resolveEventImage, type HolidayCategory } from '../data/holidays';

type EventDetailData = {
    id: string;
    name: string;
    date: string;
    category: HolidayCategory | 'Announcement' | 'Birthday' | 'Anniversary';
    description?: string | null;
    image?: string | null;
    kind?: 'Holiday' | 'Announcement' | 'Birthday' | 'Anniversary';
};

function eventStyle(category: EventDetailData['category']) {
    switch (category) {
        case 'National Holiday':
        case 'Optional Holiday':
        case 'Company Holiday':
            return { background: 'var(--accent-holiday-bg)', color: 'var(--accent-holiday)' };
        case 'Announcement':
            return { background: '#E0F2FE', color: '#0F766E' };
        case 'Birthday':
            return { background: '#F3F4F6', color: '#475467' };
        case 'Anniversary':
            return { background: '#F5F3FF', color: '#6D28D9' };
        default:
            return { background: 'var(--accent-holiday-bg)', color: 'var(--accent-holiday)' };
    }
}

export default function EventDetailPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { state } = useLocation() as { state?: { event?: EventDetailData } };
    const { employees } = useEmployees();

    const event = useMemo<EventDetailData | null>(() => {
        if (state?.event) return state.event;

        try {
            const stored = JSON.parse(localStorage.getItem('roster.holidays') || '[]') as Array<{
                id: string;
                name: string;
                date: string;
                category: HolidayCategory;
                description?: string | null;
                image?: string | null;
            }>;

            const manual = stored.find((item) => item.id === id);
            if (manual) {
                return {
                    id: manual.id,
                    name: manual.name,
                    date: manual.date,
                    category: manual.category,
                    description: manual.description ?? null,
                    image: manual.image ?? null,
                    kind: manual.category === 'Announcement' ? 'Announcement' : 'Holiday',
                };
            }
        } catch {
            // Ignore invalid local storage payloads
        }

        const today = new Date();
        const year = today.getFullYear();
        for (const employee of employees) {
            if (employee.date_of_birth) {
                const dob = new Date(`${employee.date_of_birth}T00:00:00`);
                const birthdayDate = new Date(year, dob.getMonth(), dob.getDate());
                const candidateId = `birthday-${employee.id}`;
                if (candidateId === id) {
                    return {
                        id: candidateId,
                        name: `${employee.name}'s birthday`,
                        date: birthdayDate.toISOString().slice(0, 10),
                        category: 'Birthday',
                        description: 'Birthday celebration and team wishes.',
                        image: null,
                        kind: 'Birthday',
                    };
                }
            }

            const joined = new Date(`${employee.joining_date}T00:00:00`);
            const years = year - joined.getFullYear();
            if (years > 0) {
                const anniversaryDate = new Date(year, joined.getMonth(), joined.getDate());
                const candidateId = `anniversary-${employee.id}`;
                if (candidateId === id) {
                    return {
                        id: candidateId,
                        name: `${employee.name}'s ${years}-year work anniversary`,
                        date: anniversaryDate.toISOString().slice(0, 10),
                        category: 'Anniversary',
                        description: 'Work anniversary milestone and appreciation message.',
                        image: null,
                        kind: 'Anniversary',
                    };
                }
            }
        }

        return null;
    }, [employees, id, state]);

    if (!event) {
        return (
            <div className="mx-auto max-w-2xl rounded-xl border bg-white p-8" style={{ borderColor: 'var(--line-soft)' }}>
                <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>Event not found</h1>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    The selected event could not be loaded.
                </p>
                <button
                    onClick={() => navigate('/holidays')}
                    className="mt-5 px-4 py-2 text-sm font-medium"
                    style={{ background: 'var(--accent-holiday)', color: '#fff', borderRadius: 'var(--radius-sm)' }}
                >
                    Back to calendar
                </button>
            </div>
        );
    }

    const imageSrc = resolveEventImage(event.image ?? null, event.name, event.category);
    const style = eventStyle(event.category);

    return (
        <div className="mx-auto max-w-4xl">
            <button
                onClick={() => navigate('/holidays')}
                className="mb-5 font-mono text-[11px] uppercase tracking-wide hover:underline"
                style={{ color: 'var(--accent-holiday)' }}
            >
                ← Back to calendar
            </button>

            <div className="overflow-hidden border bg-white" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
                <div className="grid gap-0 md:grid-cols-[260px_1fr]">
                    <div className="border-b bg-[var(--paper)] p-5 md:border-b-0 md:border-r" style={{ borderColor: 'var(--line-soft)' }}>
                        <img
                            src={imageSrc}
                            alt={event.name}
                            className="h-52 w-full rounded-lg object-cover"
                            style={{ border: '1px solid var(--line-soft)' }}
                        />
                    </div>

                    <div className="p-6 md:p-8">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="font-mono px-2 py-1 text-[10px] uppercase" style={{ ...style, borderRadius: 'var(--radius-sm)' }}>
                                {event.category}
                            </span>
                        </div>

                        <h1 className="mt-4 text-3xl font-semibold" style={{ color: 'var(--ink)' }}>
                            {event.name}
                        </h1>

                        <div className="mt-4 space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            <p>
                                <span className="font-medium" style={{ color: 'var(--ink)' }}>Date:</span> {formatHolidayDate(event.date)}
                            </p>
                            <p>
                                <span className="font-medium" style={{ color: 'var(--ink)' }}>Type:</span> {event.kind ?? 'Event'}
                            </p>
                        </div>

                        <div className="mt-6 rounded-lg border p-4" style={{ borderColor: 'var(--line-soft)', background: 'var(--paper)' }}>
                            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                                Event details
                            </p>
                            <p className="mt-2 text-sm leading-6" style={{ color: 'var(--ink)' }}>
                                {event.description || 'No additional notes were added for this event.'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
