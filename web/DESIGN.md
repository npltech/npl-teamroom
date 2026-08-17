# Design system — "Roster"

An HR/workforce platform is fundamentally a **register**: who's in, who's out,
who's waiting on approval. The design leans into that instead of looking like
a generic SaaS dashboard.

## Palette

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#1B2430` | Sidebar, headings, primary buttons |
| `--paper` | `#F1F2ED` | App background — a cool bone white |
| `--surface` | `#FFFFFF` | Cards, panels, inputs |
| `--status-present` | `#3E6250` | Forest — present / active / approved |
| `--status-pending` | `#B8863B` | Amber — pending / on leave |
| `--status-absent` | `#A6462F` | Rust — absent / rejected |
| `--status-neutral` | `#5B6472` | Slate — informational |

Status colour is **functional**, not decorative — it's the same three colours
everywhere (attendance, leave, tasks, onboarding), so a manager learns the
vocabulary once.

## Type

- **Display — Fraunces**: a warm serif with real personality, used sparingly
  for page titles and the login headline. It keeps the platform from reading
  as another Inter-everywhere admin panel.
- **Body/UI — IBM Plex Sans**: clean, administrative, built for dense
  interfaces.
- **Data — IBM Plex Mono**: timestamps, employee codes, role tags — anything
  that behaves like a record, not prose.

## Layout & signature element

Status is shown with a **left-edge tick bar + a small mono tag**, never a
rounded pill badge — it reads like a ledger row, not a chat bubble. Borders
are hairlines (`--line`), not drop shadows. Corners are nearly square
(2–4px radius) — this is a register, not a bubble UI.

The **Roster Strip** (`src/components/RosterStrip.tsx`) is the signature
element: a vertical, time-stamped punch-card timeline. It appears on the
login screen's hero panel and again as the "Today's register" widget on the
employee dashboard, tying the brand moment directly to the product's core
function (attendance).

## Accessibility

- Visible focus ring on every interactive element (`:focus-visible`).
- `prefers-reduced-motion` respected globally.
- Colour is always paired with a text label (status tags never rely on
  colour alone).
