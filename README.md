# Automated College Timetable Generator

A web application that builds conflict-free weekly college timetables using a Genetic
Algorithm implemented from scratch in TypeScript.

**Final year project — CACS452, Project III**
B.Sc. Computer Science and Information Technology, Tribhuvan University
Academia International College, Department of Computer Application

**Prajwal Basnet · Shekhar Paudel**

---

## What it does

Timetable scheduling is NP-hard: assignments of courses to teachers, rooms and time slots
interact, so a change anywhere can break something everywhere. Most colleges still do it by
hand over two to three weeks, and still ship timetables containing clashes.

This system takes the institutional data a college already collects — teachers and the
subjects they can teach, courses and their weekly loads, rooms and their capacities, student
batches and their sizes — and evolves a population of candidate timetables until one
satisfies every hard constraint.

On the benchmark configuration named in the proposal (6 programmes, 30 courses, 20 teachers,
15 rooms, 204 sessions), it finds a conflict-free timetable in **under one second**.

| Requirement | Budget | Measured | Result |
|---|---|---|---|
| NFR1 — time to conflict-free timetable | 120,000 ms | 753 ms mean, 800 ms worst (10 seeds) | **PASS** |
| Expected Outcome 2 — generations to converge | 500 | 13.2 mean, 14 worst (10 seeds) | **PASS** |
| Expected Outcome 1 — hard-constraint violations | 0 | 0 in 10/10 runs | **PASS** |

Reproduce these numbers yourself with `npm run bench:nfr1`.

---

## Quick start

Requires **Node.js 20+** and **Docker** (for PostgreSQL).

```bash
git clone <repository-url> schedular
cd schedular

npm install              # install all workspaces
npm run db:up            # start PostgreSQL 16 in Docker (port 5433)
npm run setup            # generate Prisma client, migrate, build shared, seed data
npm run dev              # start API (:4000) and client (:5173)
```

Open **http://localhost:5173**.

| Account | Password | Role |
|---|---|---|
| `admin@academia.edu.np` | `admin123` | Administrator — full access |
| `viewer@academia.edu.np` | `viewer123` | Viewer — read and export only |

To see it work end to end: sign in as the administrator, open **Generate**, press
**Generate timetable**, and watch the convergence chart. Hard violations fall from ~106 to
zero within about fifteen generations. Then open **Timetable**, pick a batch, and export.

---

## Constraints

**Hard** — a timetable violating any of these is unusable, and the system will not report
success while one remains:

- No teacher is in two places at once
- No room is double-booked
- No student batch is double-booked
- No batch is placed in a room smaller than the batch
- No laboratory session is placed in a lecture hall
- No teacher is scheduled outside their declared availability
- No teacher is assigned a subject they are not qualified for

**Soft** — desirable, optimised after all hard constraints are satisfied:

- Minimise teacher idle gaps between classes on the same day
- Spread each batch's classes evenly across the week
- Avoid the same subject in consecutive periods for a batch
- Balance utilisation across rooms

---

## Project layout

```
schedular/
├── docker-compose.yml       PostgreSQL 16
├── packages/shared/         Types, Zod schemas and GA constants used by BOTH tiers
├── server/
│   ├── prisma/              Schema, migrations, seed data
│   └── src/
│       ├── ga/              ← The Genetic Algorithm. Zero dependencies.
│       ├── routes/          REST endpoints
│       ├── services/        Run orchestration, data loading
│       ├── middleware/      Auth, RBAC, validation, error handling
│       └── export/          PDF and Excel generation
├── client/src/
│   ├── pages/               Login, dashboard, generate, timetable, analysis, 7 CRUD screens
│   └── components/          Shell, AG-Grid timetable, shared resource page
├── benchmarks/              Reproducible performance suite → CSV
└── docs/                    UML, report, defense preparation, demo script
```

### The algorithm

`server/src/ga/` contains one file per stage of the algorithm, mapped to the proposal:

| File | Proposal step |
|---|---|
| `context.ts` | Step 1 — session expansion and encoding |
| `population.ts` | Step 2 — population initialisation |
| `fitness.ts` | Step 3 — fitness evaluation, `1 / (1 + penalty)` |
| `selection.ts` | Step 4 — tournament selection, k = 5 |
| `crossover.ts` | Step 5 — single-point crossover, rate 0.8 |
| `mutation.ts` | Step 6 — mutation, rate 0.05 |
| `engine.ts` | Step 7 — termination, and the evolutionary loop |
| `repair.ts` | Documented refinement — targeted local search |
| `feasibility.ts` | NFR4 — pre-flight impossibility detection |
| `rng.ts` | Seedable PRNG, so every result is reproducible |

No optimisation, solver or GA library is used anywhere. `package.json` can be inspected to
confirm this.

---

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Run API and client together |
| `npm test` | Run the test suite (65 tests) |
| `npm run seed` | Reset the database to the benchmark dataset |
| `npm run ga:cli` | Run the algorithm from the terminal, no browser |
| `npm run bench` | Full benchmark suite → `benchmarks/results/*.csv` |
| `npm run bench:nfr1` | Just the NFR1 compliance benchmark |
| `npm run build` | Production build of all workspaces |

`npm run ga:cli` accepts the parameters directly:

```bash
npm run ga:cli -- --population 200 --mutation 0.01 --seed 7
```

---

## Technology

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + TypeScript | Type safety over the multi-dimensional timetable structures |
| Grid | AG-Grid Community | Sorting, filtering and custom cell rendering (FR3) |
| Charts | Recharts | Live convergence curve (FR4) |
| Backend | Node.js 20 + Express | One language across the stack; `packages/shared` is imported by both tiers |
| Database | PostgreSQL 16 + Prisma | Real foreign keys and data integrity (NFR3) |
| Export | exceljs, pdfmake | Multi-sheet Excel and print-ready PDF (FR5) |
| Tests | Vitest | Unit, integration and property-based tests |

---

## Documentation

- [`docs/REPORT.md`](docs/REPORT.md) — the full project report in CACS452 chapter order
- [`docs/UML.md`](docs/UML.md) — use case, class, ER, sequence, activity and component diagrams
- [`docs/DEFENSE.md`](docs/DEFENSE.md) — anticipated examiner questions with prepared answers
- [`docs/DEMO.md`](docs/DEMO.md) — the exact click path for the live demonstration
- [`PLAN.md`](PLAN.md) — the build plan this project was executed against
