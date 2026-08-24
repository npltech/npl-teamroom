import { useCallback, useEffect, useState } from 'react';

export type OpeningStatus = 'OPEN' | 'PAUSED' | 'CLOSED';
export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
export type CandidateStage = 'APPLIED' | 'SCREENING' | 'SHORTLISTED' | 'INTERVIEW' | 'SELECTED' | 'OFFER_SENT' | 'HIRED' | 'REJECTED';

export interface JobOpening {
    id: string;
    title: string;
    department: string;
    hiring_manager: string;
    positions: number;
    employment_type: EmploymentType;
    experience: string;
    location: string;
    description: string;
    status: OpeningStatus;
    created_date: string;
}

export interface Candidate {
    id: string;
    name: string;
    email: string;
    phone: string;
    opening_id: string;
    experience: string;
    source: string;
    stage: CandidateStage;
    interview_date: string;
    feedback: string;
}

const OPENINGS_KEY = 'roster.recruitment.openings';
const CANDIDATES_KEY = 'roster.recruitment.candidates';

const SEED_OPENINGS: JobOpening[] = [
    { id: 'job-1', title: 'Senior Frontend Engineer', department: 'Engineering', hiring_manager: 'Vikram Joshi', positions: 2, employment_type: 'Full-time', experience: '4-7 years', location: 'Ludhiana / Hybrid', description: 'Build accessible, reliable product experiences for the Roster platform.', status: 'OPEN', created_date: '2026-08-04' },
    { id: 'job-2', title: 'People Operations Specialist', department: 'Human Resources', hiring_manager: 'Anita Rao', positions: 1, employment_type: 'Full-time', experience: '2-4 years', location: 'Ludhiana', description: 'Support employee lifecycle programs and people operations workflows.', status: 'OPEN', created_date: '2026-08-08' },
    { id: 'job-3', title: 'Product Design Intern', department: 'Design', hiring_manager: 'Anita Rao', positions: 1, employment_type: 'Internship', experience: '0-1 years', location: 'Remote', description: 'Join the product design team for a hands-on six-month internship.', status: 'PAUSED', created_date: '2026-07-26' },
];

const SEED_CANDIDATES: Candidate[] = [
    { id: 'candidate-1', name: 'Riya Mehta', email: 'riya.mehta@example.com', phone: '+91 98765 12001', opening_id: 'job-1', experience: '5 years', source: 'LinkedIn', stage: 'INTERVIEW', interview_date: '2026-08-26T11:00', feedback: '' },
    { id: 'candidate-2', name: 'Karan Bedi', email: 'karan.bedi@example.com', phone: '+91 98765 12002', opening_id: 'job-1', experience: '4 years', source: 'Referral', stage: 'SHORTLISTED', interview_date: '', feedback: '' },
    { id: 'candidate-3', name: 'Simran Kaur', email: 'simran.kaur@example.com', phone: '+91 98765 12003', opening_id: 'job-2', experience: '3 years', source: 'Website', stage: 'SCREENING', interview_date: '', feedback: '' },
    { id: 'candidate-4', name: 'Aditya Kapoor', email: 'aditya.kapoor@example.com', phone: '+91 98765 12004', opening_id: 'job-1', experience: '6 years', source: 'Naukri', stage: 'OFFER_SENT', interview_date: '2026-08-18T15:30', feedback: 'Strong technical and collaboration skills.' },
    { id: 'candidate-5', name: 'Neha Arora', email: 'neha.arora@example.com', phone: '+91 98765 12005', opening_id: 'job-3', experience: '1 year', source: 'Campus', stage: 'APPLIED', interview_date: '', feedback: '' },
];

function load<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) {
            localStorage.setItem(key, JSON.stringify(fallback));
            return fallback;
        }
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

export function useRecruitment() {
    const [openings, setOpenings] = useState<JobOpening[]>(() => load(OPENINGS_KEY, SEED_OPENINGS));
    const [candidates, setCandidates] = useState<Candidate[]>(() => load(CANDIDATES_KEY, SEED_CANDIDATES));

    useEffect(() => localStorage.setItem(OPENINGS_KEY, JSON.stringify(openings)), [openings]);
    useEffect(() => localStorage.setItem(CANDIDATES_KEY, JSON.stringify(candidates)), [candidates]);

    const addOpening = useCallback((opening: Omit<JobOpening, 'id' | 'created_date'>) => {
        setOpenings((prev) => [...prev, { ...opening, id: crypto.randomUUID(), created_date: new Date().toISOString().slice(0, 10) }]);
    }, []);
    const updateOpening = useCallback((id: string, changes: Omit<JobOpening, 'id' | 'created_date'>) => {
        setOpenings((prev) => prev.map((opening) => opening.id === id ? { ...opening, ...changes } : opening));
    }, []);
    const toggleOpening = useCallback((id: string) => {
        setOpenings((prev) => prev.map((opening) => opening.id === id ? { ...opening, status: opening.status === 'CLOSED' ? 'OPEN' : 'CLOSED' } : opening));
    }, []);
    const addCandidate = useCallback((candidate: Omit<Candidate, 'id'>) => {
        setCandidates((prev) => [...prev, { ...candidate, id: crypto.randomUUID() }]);
    }, []);
    const updateCandidate = useCallback((id: string, changes: Partial<Omit<Candidate, 'id'>>) => {
        setCandidates((prev) => prev.map((candidate) => candidate.id === id ? { ...candidate, ...changes } : candidate));
    }, []);

    return { openings, candidates, addOpening, updateOpening, toggleOpening, addCandidate, updateCandidate };
}
