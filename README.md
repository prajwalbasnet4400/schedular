# Automated College Timetable Generator

A Genetic Algorithm, written from scratch in TypeScript, that builds a clash-free weekly
college timetable. It runs entirely in the browser: press **Generate** and watch it converge.

**Final year project — CACS452, Project III**
Bachelor in Computer Application (BCA), Tribhuvan University
Academia International College, Department of Computer Application

**Prajwal Basnet · Shekhar Paudel**

---

## Run it

Requires **Node.js 20+**.

```bash
npm install
npm run dev      # open http://localhost:5173
npm test         # 10 tests
```

## The problem

2 programmes (BCA and B.Sc. CSIT) with 2 sections each, so 4 batches, 8 courses, 5 teachers
and 3 rooms. Every course has 3 lectures a week, so **48 sessions** have to be placed into
**36 slots** (Sunday–Friday × 6 periods). The sample data lives in [`src/data.ts`](src/data.ts).
It is kept small so the demo is quick to explain; the search space is still about 10^95.

Courses, teachers, rooms and batches can be edited on the page under **Edit college data**
(add, remove, rename; renaming a course code updates every teacher and batch that lists it).
Impossible data (a duplicate course code, an unknown course, a course nobody can teach, a
batch no room fits) is reported and disables Generate. Edits are kept only in the page's
memory: there is no database, so a reload restores the sample data. Departments,
programmes and time slots cannot be edited.

**Hard constraints** — must all be satisfied:
- a teacher is never in two places at once
- a room is never booked twice
- a batch is never in two classes at once
- a teacher only teaches courses they are qualified for *(by construction)*
- a batch only goes in a room big enough for it *(by construction)*

**Soft constraints** — optimised once the hard ones hold:
- few idle gaps in a teacher's day
- each batch's classes spread evenly across the week

## The algorithm

[`src/ga/`](src/ga) has one file per step of the proposal (§4.3.2):

| File | Step |
|---|---|
| `problem.ts` | 1 — Encoding: one gene per session, gene = (teacher, room, slot) |
| `population.ts` | 2 — 100 random timetables |
| `fitness.ts` | 3 — `fitness = 1 / (1 + penalty)`; 100 per clash, small soft penalties |
| `selection.ts` | 4 — Tournament selection, k = 5 |
| `crossover.ts` | 5 — Single-point crossover, rate 0.8, top 20% kept as elites |
| `mutation.ts` | 6 — Mutation, rate 0.05: new room, new slot, or both |
| `engine.ts` | 7 — The loop and termination (max 1000 generations) |
| `repair.ts` | Our addition: move clashing genes to a better spot if one exists |
| `rng.ts` | Seeded random numbers, so every run is reproducible |

The parameters (population, rates, tournament size, elitism, seed, …) can be edited on the
page before each run; they start at the proposal's values.

Every file is commented in plain English (what the step does, why, and a worked example),
and the page explains each box and the chart as you use it.

No GA or optimisation library is used. The only runtime dependencies are React and Recharts.

## Results

Across 10 seeds on the data above:

| | Generations to clash-free | Time to clash-free | Reaches fitness 1.0 |
|---|---|---|---|
| With repair | 2.2 mean, 3 worst | 26 ms mean, 38 ms worst | 10/10, after 18–47 generations (138–327 ms) |
| Plain GA (Steps 1–7 only) | 16.2 mean, 11–22 range | — | 2/10; the rest stop at 0.42–0.77 |

The proposal's budgets were 500 generations and 120 seconds.

With repair, every run reaches fitness exactly 1.0 (zero hard and zero soft penalty), so the
loop stops on the proposal's own "fitness = 1.0" condition. On bigger or tighter data, where
soft penalties cannot reach zero, a fallback stops the run once it is clash-free and has not
improved for 20 generations.

NFR1 (6 programmes, 30 courses, 20 teachers, 15 rooms in under 120 s) was measured on the
earlier, larger sample (180 sessions; still in git history at commit `4a72724`, `src/data.ts`):
clash-free in 384 ms mean and 442 ms worst over 10 seeds. A dataset that size can be entered
under **Edit college data**.
