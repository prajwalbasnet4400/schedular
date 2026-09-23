# Automated College Timetable Generator

A Genetic Algorithm, written from scratch in TypeScript, that builds a clash-free weekly
college timetable. It runs entirely in the browser: press **Generate** and watch it converge.

**Final year project — CACS452, Project III**
B.Sc. Computer Science and Information Technology, Tribhuvan University
Academia International College, Department of Computer Application

**Prajwal Basnet · Shekhar Paudel**

---

## Run it

Requires **Node.js 20+**.

```bash
npm install
npm run dev      # open http://localhost:5173
npm test         # 8 tests
```

## The problem

6 programmes, 30 courses, 20 teachers, 15 rooms and 12 batches (the NFR1 configuration).
Every course has 3 lectures a week, so **180 sessions** have to be placed into **36 slots**
(Sunday–Friday × 6 periods). The data lives in [`src/data.ts`](src/data.ts).

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

No GA or optimisation library is used. The only runtime dependencies are React and Recharts.

## Results

Across 10 seeds on the data above:

| | Generations to clash-free | Time to clash-free |
|---|---|---|
| With repair | 7.1 mean, 8 worst | 384 ms mean, 442 ms worst |
| Plain GA (Steps 1–7 only) | 378.8 mean, 572 worst; 2/10 miss the 500-generation target | — |

The proposal's budgets were 500 generations and 120 seconds.

Fitness ends near 0.1, not 1.0, because a real timetable always keeps a few soft penalties
(a teacher with one free hour). Zero hard violations is the goal; the run stops once it has
that and the soft score has stopped improving for 20 generations.
