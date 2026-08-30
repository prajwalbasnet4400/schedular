# Automated College Timetable Generator — Build Plan

**Course:** CACS452, Project III · B.Sc. CSIT, Tribhuvan University
**Institution:** Academia International College, Dept. of Computer Application
**Members:** Prajwal Basnet, Shekhar Paudel
**Goal:** A complete, running, defensible system that satisfies every FR/NFR and Expected Outcome in `Proposal.pdf`.

---

## 0. Guiding principle: the proposal is the contract

The defense panel will hold the demo against the proposal, so every claim in it is a hard
requirement, not a suggestion. Non-negotiables extracted from the PDF:

| Proposal claim | Binding requirement |
|---|---|
| React + TypeScript, AG-Grid Community | Exact stack — no MUI DataGrid, no TanStack Table substitute |
| Node.js + Express, RESTful API | No Nest/Fastify |
| PostgreSQL, FK constraints, validation | Real relational integrity, not SQLite |
| "GA implemented **from scratch** in TypeScript **without external optimization libraries**" | Zero GA/solver deps. Hand-written selection, crossover, mutation, fitness. This is the single most-examined claim. |
| `Fitness = 1 / (1 + total_penalty)`, range 0.0–1.0, perfect = 1.0 | Formula must match the code line-for-line |
| pop=100, k=5, crossover=0.8, elitism=20%, mutation=0.05, maxGen=1000 | Defaults in config must be these exact numbers |
| Chromosome = array of genes, gene = (Course, Teacher, Room, TimeSlot, Batch) | Encoding must match §4.3.2 Step 1 |
| NFR1: 6 programs / 30 courses / 20 teachers / 15 rooms in **<120s** | Must be measured and reproducible on stage |
| Outcome 2: fitness 1.0 within **500 generations** | Must be demonstrated, with the convergence graph as evidence |
| Realtime generation feedback (generation #, fitness) | Streaming progress, not a blocking spinner |
| PDF + Excel export, separate page/sheet per batch/teacher/room | Both formats, all three views |
| RBAC: ADMIN (mutate + run) vs VIEWER (read + export) | Enforced server-side, demoed with two logins |

**Decisions confirmed with the team** (2026-08-30):
1. Nepali academic week = **Sunday–Friday**, 6 teaching days. Saturday is a holiday.
2. **6 × 1-hour periods, 06:30–12:30** (TU morning shift) → 36 weekly slots. Stored in the DB,
   so the period grid stays configurable without a code change.
3. **Lab sessions occupy 2 consecutive periods and require a `LAB`-type room.** Genes carry a
   `sessionGroupId` so paired genes are moved atomically by crossover and mutation.
4. Full written deliverable in scope: UML, README, CACS452-format report, defense Q&A, demo script.
5. Deployment target is a local demo (Docker Compose), not a public cloud host.

---

## 1. Architecture

Three-tier, exactly as §4.3.1 describes, in a TypeScript monorepo so the shared entity types
can be cited during the defense as evidence for the "single language across the stack"
feasibility argument.

```
schedular/
├── docker-compose.yml          # PostgreSQL 16 (no local psql on this machine)
├── package.json                # npm workspaces
├── packages/
│   └── shared/                 # types + Zod schemas, imported by BOTH tiers
├── server/                     # Express + Prisma + the GA engine
│   ├── prisma/schema.prisma
│   └── src/
│       ├── ga/                 # ← the graded core, dependency-free
│       ├── routes/  services/  middleware/
│       └── export/             # PDF + Excel
├── client/                     # Vite + React + TS + AG-Grid
├── docs/                       # UML, report assets, defense material
└── benchmarks/                 # NFR1 + convergence harness
```

**Why a monorepo:** §4.2.1 argues Node.js is justified *because* frontend and backend share
TypeScript entity definitions. `packages/shared` makes that argument literally true and
demonstrable, instead of a claim on paper.

---

## 2. Data model (Prisma → PostgreSQL)

Directly from §4.3.4, normalised, with FK constraints as NFR3 requires.

- **Department** — code, name → has many Course, Instructor
- **Program** — e.g. B.Sc. CSIT, BCA, BIM → has many Batch
- **Course** — code, name, creditHours, `lecturesPerWeek`, `labsPerWeek`, `type: LECTURE|LAB`, departmentId
- **Instructor** — name, email, departmentId; M:N `qualifiedFor` → Course; weekly availability
- **Room** — number, `capacity`, `type: LECTURE_HALL|LAB`, building
- **Batch** — programId, semester, section, `studentCount`; M:N → Course (the offering set)
- **MeetingTime** — `day: SUN..FRI`, `period`, startTime, endTime (unique on day+period)
- **InstructorAvailability** — join Instructor × MeetingTime (`isAvailable`) — backs the FR1 "weekly availability slots" attribute
- **ScheduleRun** — a GA execution: params snapshot, bestFitness, generations, durationMs, status, violation report
- **ScheduleAssignment** — one decoded gene: runId, courseId, instructorId, roomId, meetingTimeId, batchId

Storing `ScheduleRun` **with its parameter snapshot** is deliberate: it turns Expected
Outcome 5 (comparative analysis of parameter configurations) into a database query instead of
a screenshot the panel has to take on faith.

**Seed data:** a realistic Academia International College dataset sized to NFR1 — 6 programs,
30 courses, 20 teachers, 15 rooms, ~12 batches — with real TU CSIT/BCA course codes. Seeding
is one command so the demo can be reset mid-defense if anything goes wrong.

---

## 3. The Genetic Algorithm — `server/src/ga/`

Zero dependencies. Every file readable aloud under questioning.

| File | Contents |
|---|---|
| `types.ts` | `Gene`, `Chromosome`, `GAConfig`, `FitnessBreakdown` |
| `context.ts` | Loads DB → immutable in-memory indices (teacher→courses, room→capacity). Built once per run; the fitness function never touches the DB. |
| `encoding.ts` | Session expansion: a course needing 3 lectures/week yields 3 genes (§4.3.2 Step 1). Lab sessions expand as consecutive-period pairs. |
| `population.ts` | Step 2 — N=100 random valid-teacher / random-room / random-slot chromosomes |
| `fitness.ts` | Step 3 — penalty accumulation, then `1/(1+penalty)` |
| `selection.ts` | Step 4 — tournament, k=5 |
| `crossover.ts` | Step 5 — single-point, rate 0.8, 20% elite carry-forward |
| `mutation.ts` | Step 6 — per-gene p=0.05, reassigns room / slot / both |
| `engine.ts` | Step 7 — the loop, termination at fitness 1.0 or 1000 generations, per-generation progress callback |
| `rng.ts` | **Seedable** PRNG (mulberry32) — makes every benchmark reproducible |

**Fitness weights** (hard ≫ soft, per Abramson [5] as cited in §4.1.2):

*Hard (weight 100 each):* teacher double-booking · room double-booking · room capacity < batch
size · batch double-booking · room type mismatch (lab in a lecture hall) · teacher assigned
outside declared availability · teacher not qualified for the course.

*Soft (weight 1–5):* instructor idle gaps · uneven distribution across the week · back-to-back
lectures for one batch · room-utilisation imbalance.

Two points worth pre-empting, because a sharp examiner will raise them:

1. **Batch double-booking is not in the proposal's hard-constraint list** (§4.3.2 Step 3 names
   only teacher, room, capacity). It is nonetheless indispensable — without it a batch can be
   scheduled into two rooms at once and the timetable is nonsense. I will implement it and
   document the addition explicitly in the report as a refinement discovered during
   implementation, rather than silently deviate.
2. **`Fitness = 1/(1+penalty)` cannot distinguish a good soft score from a perfect one** once
   penalty hits 0. That is fine and matches the proposal; the soft-constraint improvement is
   shown separately in the breakdown panel.

**Performance:** the naive fitness function is O(genes²). At NFR1 scale that is ~600 genes ×
100 population × 1000 generations — too slow for the 120s budget. I will use bucketed conflict
counting (hash by `timeslot` → count collisions per teacher/room/batch), which is O(genes) per
chromosome. Expected: well under 120s single-threaded. If it isn't, the fallback is a
`worker_threads` pool for fitness evaluation — already foreshadowed in §4.2.1's mention of
multi-core parallelisation, so it is a defensible escalation rather than an improvisation.

---

## 4. Backend API

Express + Zod validation + JWT auth + Prisma.

- `POST /api/auth/login`, `GET /api/auth/me` — JWT, bcrypt, roles `ADMIN` / `VIEWER` (FR6)
- Full CRUD for departments, programs, courses, instructors, rooms, batches, meeting-times,
  availability (FR1) — `requireRole('ADMIN')` on every mutation
- `POST /api/schedule/generate` — starts a run, returns `runId`
- `GET  /api/schedule/runs/:id/stream` — **SSE** streaming `{generation, bestFitness, hardViolations}` (FR4)
- `GET  /api/schedule/runs/:id` — final timetable + fitness breakdown + convergence series
- `GET  /api/schedule/runs` — run history, for the parameter-comparison table
- `GET  /api/schedule/runs/:id/export.pdf|.xlsx?view=batch|teacher|room` (FR5)
- `POST /api/schedule/validate` — **pre-flight feasibility check** (NFR4)

NFR4 deserves emphasis: before burning 1000 generations, the system checks whether required
sessions exceed available room×timeslot capacity, whether any course lacks a qualified
teacher, whether any batch exceeds every room's capacity — and returns a specific, human
message. "Panel asks: what if the data is impossible?" is a near-certain defense question, and
this is the answer.

**SSE over WebSockets** for FR4: one-directional, no extra dependency, trivially reconnectable,
and easier to explain in the report.

---

## 5. Frontend

Vite + React 18 + TypeScript + AG-Grid Community + React Router + TanStack Query.

- **Login** → role-aware shell
- **Data management** — six CRUD screens, forms validated by the shared Zod schemas; an
  availability matrix editor (instructor × 36 slots) since typing that in a plain form is
  unusable
- **Generate** — parameter panel (pop/gens/mutation/crossover/tournament, pre-filled with the
  proposal defaults), Run button, and a **live convergence chart** driven by the SSE stream
  showing best/average fitness climbing per generation. This is the moment that sells the
  project on stage.
- **Timetable grid** — AG-Grid, days as rows × periods as columns, view switcher
  (Batch / Teacher / Room) plus filters (FR3), lectures vs labs colour-coded, cell click →
  assignment detail
- **Export** — PDF / Excel per view (FR5)
- **Analysis** — run history, convergence comparison across parameter configurations,
  input-size vs time benchmark chart (Expected Outcome 5, ready to render in the report)

Responsive down to 768px per NFR2.

---

## 6. Export module

- **Excel** — `exceljs`, one worksheet per batch / teacher / room, styled grid, print-ready
- **PDF** — `pdfmake`, one page per entity, college header, generation timestamp, landscape

Both are output formatting, not optimisation, so neither touches the "from scratch" claim.

---

## 7. Testing

- **Unit (Vitest)** — every GA operator in isolation: fitness returns exactly 1.0 for a
  hand-built conflict-free schedule; each violation type is detected; crossover preserves gene
  count; mutation only produces valid values; tournament selection is biased toward fitness.
- **Property-based** — over 200 random runs, output assignments never violate a hard constraint
  when reported fitness is 1.0. This is the strongest possible evidence for Expected Outcome 1
  ("zero instances of double-booking").
- **Integration (Supertest)** — auth, RBAC denial paths, CRUD, full generate→export cycle.
- **E2E (Playwright)** — login → seed → generate → filter → export, as one recorded flow.
- Test-case tables exported in the report's prescribed format.

---

## 8. Benchmarks — the Result Analysis section

Scripted, reproducible, seeded, CSV + chart output:

1. **NFR1 compliance** — the 6/30/20/15 configuration, 10 seeded runs, report mean/median/max
   time-to-fitness-1.0 and generations-to-convergence. Must land <120s and <500 generations.
2. **Parameter sweep** — population {50,100,200} × mutation {0.01,0.05,0.1} × crossover
   {0.6,0.8,0.95}, convergence generation and wall time per cell.
3. **Scalability** — small / medium / large / stress inputs, time vs input size curve.
4. **Ablation** — with vs without elitism, tournament k ∈ {2,5,10}, to show the defaults were
   chosen empirically rather than copied.

Everything writes to `benchmarks/results/` as CSV so the report's figures are regenerable, not
hand-drawn.

---

## 9. Documentation & defense package (`docs/`)

- **UML** (Mermaid, rendered to PNG): use-case, class, ER, sequence (generation flow),
  activity (GA loop), component/deployment — Expected Outcome 6
- **System flowchart** matching §4.3.3
- **README** — one-command setup, so an examiner can run it themselves
- **REPORT.md** — the full report in the CACS452 prescribed chapter order, with real numbers
  from §8 filled in
- **DEFENSE.md** — anticipated questions with prepared answers: *Why GA and not backtracking or
  simulated annealing? Why is this NP-hard? What exactly does your fitness function penalise?
  Show me the crossover code. What happens with infeasible input? Why did you add
  batch-conflict? What is your convergence rate? What if the GA gets stuck in a local optimum?*
- **Demo script** — the exact click path for the live demonstration, with a reset command

---

## 10. Execution order

| Phase | Work | Verified by |
|---|---|---|
| 1 | Monorepo, Docker Postgres, Prisma schema, migrations, seed | `docker compose up`, seed runs, data visible |
| 2 | Auth + RBAC + all CRUD endpoints + validation | Integration tests green |
| 3 | **GA engine** + unit/property tests | Fitness 1.0 reached on seed data via CLI |
| 4 | Generation API + SSE + feasibility pre-check | Stream observed with `curl` |
| 5 | React shell, auth, CRUD screens, availability matrix | Manual pass |
| 6 | AG-Grid timetable, 3 views, filters, colour coding | FR3 satisfied |
| 7 | Live convergence chart on the generate screen | FR4 satisfied |
| 8 | PDF + Excel export, all views | FR5 satisfied |
| 9 | Benchmark harness, full sweep, CSV + charts | NFR1 proven with numbers |
| 10 | UML, report, defense doc, demo script, E2E | Panel-ready |

Phase 3 is the graded heart of the project and gets the most care. Phases 1–2 are
scaffolding — fast. Phase 9 is where a project either survives the panel or doesn't, because
it converts every claim into a measurement.

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| GA misses 120s at NFR1 scale | Bucketed O(n) fitness first; `worker_threads` fitness pool as the documented fallback |
| GA stalls in a local optimum below 1.0 | Elitism + adaptive mutation bump on stagnation + restart-on-plateau, all documented as tuning findings |
| Lab double-period constraint complicates crossover | Genes carry a `sessionGroupId`; crossover and mutation move grouped genes atomically |
| Demo-day failure | Seeded RNG + a pre-computed run stored in the DB, so a known-good timetable is always displayable |
| Scope creep | FR1–FR6 and NFR1–NFR4 are the fence; anything else is post-defense |

---

## Status: complete (2026-08-30)

Every phase in §10 executed. Headline results, all reproducible via `npm run bench`:

| Claim | Budget | Measured | Verdict |
|---|---|---|---|
| NFR1 — time to conflict-free timetable | 120,000 ms | 753 ms mean, 800 ms worst (10 seeds) | PASS, 150× margin |
| Expected Outcome 2 — generations | 500 | 13.2 mean, 14 worst | PASS, 36× margin |
| Expected Outcome 1 — hard violations | 0 | 0 in 10/10 runs | PASS |
| Test suite | — | 65 tests, all green | PASS |

Three risks in §11 materialised and were resolved as planned:

- **The GA did stall in a local optimum**, exactly as anticipated. Two causes: soft weights
  drowning the hard-constraint signal, and blind mutation. Fixed by rescaling soft weights and
  adding a targeted repair operator. The ablation study quantifies it — the proposal's Steps
  1–7 alone solve **0/5** runs; with repair, **5/5**.
- **The naive O(n²) fitness was too slow**, as predicted. Bucketed O(n) counting was
  sufficient; the `worker_threads` fallback was never needed.
- **The lab double-period constraint** was handled by the planned `sessionGroupId` grouping,
  simplified further by encoding a lab as one gene with a duration rather than two linked genes.

Two things the plan did not anticipate:

- **The feasibility checker (NFR4) caught a real defect in our own seed data** — lab capacity
  40 against a 55-student cohort — before the algorithm ever ran. Kept as a defense
  demonstration.
- **A scalability ceiling below 600 sessions.** The stress instance does not converge. Beyond
  NFR1's scale, but reported honestly in the report and defense notes rather than omitted.
