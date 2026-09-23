# Automated College Timetable Generator

**A Project Report submitted to the Department of Computer Application, Academia
International College, in partial fulfilment of the requirements for the Bachelors in
Computer Application**

**Course:** CACS452 — Project III
**Programme:** B.Sc. Computer Science and Information Technology, Tribhuvan University
**Submitted by:** Prajwal Basnet, Shekhar Paudel

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Problem Statement and Objectives](#2-problem-statement-and-objectives)
3. [Requirement Analysis](#3-requirement-analysis)
4. [System Design](#4-system-design)
5. [Implementation](#5-implementation)
6. [Testing](#6-testing)
7. [Result Analysis](#7-result-analysis)
8. [Conclusion and Future Work](#8-conclusion-and-future-work)
9. [References](#9-references)

---

## 1. Introduction

### 1.1 Background

The efficient allocation of academic resources is one of the most operationally challenging
tasks faced by higher education institutions. Timetable scheduling requires the simultaneous
satisfaction of multiple constraints involving teachers, students, classrooms and time slots,
making it a classic constraint satisfaction problem. As colleges grow in enrolment and expand
their course offerings, the complexity of generating conflict-free schedules increases
sharply, rendering manual approaches both error-prone and time-consuming.

The Automated College Timetable Generator addresses this challenge using a Genetic Algorithm
to compute conflict-free weekly class schedules. The system takes institutional data —
courses, qualified teachers, room capacities and batch sizes — and produces a complete
timetable with no clashes, while reducing soft penalties such as teacher idle gaps and an
uneven spread of classes across the week.

### 1.2 Scope

The project's core is a Genetic Algorithm written from scratch in TypeScript, fulfilling the
syllabus requirement for algorithmic depth and original program module development. It runs
entirely in the browser as a single-page React application: one button starts the algorithm,
a live chart shows it converging, and the finished timetable is shown by batch, teacher or
room.

The proposal also described a full administration system (database, login, data-entry
screens, PDF/Excel export). We deliberately left these out so the project stays focused on
the algorithm. The data is fixed in one source file. §3.3 lists exactly what was cut.

### 1.3 Summary of achievement

On the configuration specified in the proposal — six programmes, thirty courses, twenty
teachers and fifteen rooms, amounting to 180 class sessions — the system produces a timetable
with **zero hard-constraint violations in a mean of 384 milliseconds and 7.1 generations**,
across ten seeded runs. NFR1 allowed 120 seconds; Expected Outcome 2 allowed 500 generations.

---

## 2. Problem Statement and Objectives

### 2.1 Problem statement

College timetable scheduling is a combinatorial optimisation problem classified as NP-hard:
no known polynomial-time algorithm can guarantee an optimal solution for all instances. In a
typical Nepali college affiliated with Tribhuvan University, the scheduling process involves
assigning lectures for multiple programmes across shared classrooms and faculty members who
may teach in more than one programme.

Most colleges rely on a manual, committee-driven approach. A small group of administrators
spends several days — sometimes weeks — constructing the schedule on paper or in spreadsheet
software. This process suffers from five critical shortcomings:

| Shortcoming | Consequence |
|---|---|
| **Resource conflicts** | A teacher booked for two classes at once, or two batches in one room. Detecting these across hundreds of slots is tedious and error-prone. |
| **Time inefficiency** | Two to three weeks of coordination each semester. Any mid-semester change forces a near-complete rework. |
| **Suboptimal utilisation** | Large rooms assigned to small classes while smaller rooms sit empty; instructors left with long idle gaps. |
| **Lack of scalability** | Each new batch introduces constraints interacting with every existing one, so complexity grows disproportionately. |
| **No standardised validation** | No systematic mechanism verifies that all constraints are met. Errors surface only after the semester begins. |

### 2.2 Objectives

1. Develop a data management module for registering and managing institutional entities
   through a web interface.
2. Design and implement a custom Genetic Algorithm from scratch that produces an optimised
   weekly timetable satisfying all hard constraints.
3. Incorporate soft-constraint optimisation within the fitness function.
4. Build an interactive frontend displaying the timetable with teacher, room and batch
   perspectives.
5. Implement an export module producing PDF and Excel output.
6. Evaluate the algorithm's performance: convergence behaviour, fitness progression and
   completion time.

Objectives 2, 3, 4 and 6 were met. Objectives 1 and 5 were dropped as part of the scope
reduction in §3.3.

---

## 3. Requirement Analysis

### 3.1 Functional requirements

| ID | Requirement | Status |
|---|---|---|
| FR1 | Administrator interface for CRUD on departments, teachers, courses, rooms, batches and time slots | Not implemented — data is edited in `src/data.ts` |
| FR2 | Genetic Algorithm engine enforcing hard constraints: no teacher double-booking, no room double-booking, no capacity violation | Implemented — plus batch double-booking (§5.3) |
| FR3 | Interactive grid with filtering by teacher, batch, room and department; colour coding for lecture and laboratory sessions | Partial — plain table, view by batch / teacher / room; no department filter, no labs to colour |
| FR4 | Real-time feedback during generation showing generation number and fitness score | Implemented — live chart in the browser |
| FR5 | Export to PDF and Excel | Not implemented |
| FR6 | Authentication with role-based access control | Not implemented |

### 3.2 Non-functional requirements

| ID | Requirement | Status |
|---|---|---|
| NFR1 | Conflict-free timetable for 6 programmes / 30 courses / 20 teachers / 15 rooms within 120 seconds | **Met** — 384 ms mean, 442 ms worst (§7.1) |
| NFR2 | Responsive interface from tablet to desktop | Met — simple CSS with a phone breakpoint; the table scrolls horizontally |
| NFR3 | Persistence in a relational database with foreign key constraints | Not implemented — no database |
| NFR4 | Meaningful error messages when input data makes a feasible schedule impossible | Partial — a plain error if a course has no qualified teacher or a batch fits no room |

### 3.3 Deviations from the proposal

The proposal described a three-tier web system: React front end, Express API, PostgreSQL
database, login with administrator and viewer roles, data-entry screens and PDF/Excel export.
An earlier version of this project built all of that. We then cut it back to a browser-only
demo, because the administrative parts added a great deal of code to explain and none of it
was the subject of the project. What was removed:

- the backend, database, login and roles (FR1, FR6, NFR3);
- PDF and Excel export (FR5);
- laboratory sessions, room types, teacher availability and departments from the data;
- the pre-flight feasibility checker (reduced to two plain error messages, NFR4);
- from the algorithm: adaptive mutation, random immigrants, a teacher-reassignment mutation
  case, and two soft constraints (consecutive same subject, room utilisation balance).

The algorithm itself — proposal Steps 1–7 with the parameters the proposal names — is intact.

### 3.4 Constraint specification

**Hard constraints** — a timetable violating any of these is unusable:

| Constraint | How it is enforced |
|---|---|
| Teacher assigned to two sessions in one time slot | Penalty 100 each |
| Room assigned to two sessions in one time slot | Penalty 100 each |
| Batch assigned to two sessions in one time slot | Penalty 100 each |
| Teacher not qualified for the course | By construction — never generated |
| Room capacity less than batch size | By construction — never generated |

**Soft constraints** — desirable, optimised after hard constraints are satisfied:

| Constraint | Penalty weight |
|---|---|
| Teacher idle gap (free period between taught periods on one day) | 0.3 each |
| Uneven distribution of a batch's classes across the week | 0.2 × deviation |

---

## 4. System Design

### 4.1 Architecture

The system is a single browser application with no server:

- **React 18 + TypeScript**, built with **Vite**.
- **Recharts** for the live convergence chart.
- **Vitest** for the tests.

| File | Responsibility |
|---|---|
| `src/data.ts` | The college data: courses, teachers, rooms, batches, days and periods |
| `src/ga/` | The Genetic Algorithm, one file per proposal step (§5.1) |
| `src/App.tsx` | The page: Generate button, stat tiles, live chart |
| `src/Timetable.tsx` | The timetable grid with its view selector |

See [`UML.md`](UML.md) for the diagrams.

### 4.2 Data

The data is hard-coded in `src/data.ts`, sized to the NFR1 configuration: 6 programmes (BCA,
B.Sc. CSIT, BIM, BBA, BBM, BHM), 30 courses, 20 teachers and 15 rooms. Each programme runs
two sections, giving 12 batches, and every course has 3 lectures a week:
12 batches × 5 courses × 3 = **180 sessions**. The week is Sunday to Friday, six one-hour
periods from 06:30 to 12:30, so there are **36 slots**.

Teacher qualifications overlap on purpose, so most courses have more than one teacher who
could take them and the algorithm has a real choice.

### 4.3 Chromosome encoding

Each candidate timetable is an array of genes, one per class session. The proposal's gene is
the tuple (Course, Teacher, Room, Time Slot, Batch). If a course requires three lectures per
week, three genes are created.

The list of sessions is fixed before the search starts and never changes. Because it is fixed
and ordered, gene *i* always describes session *i*, so course and batch are read from the
session list and the gene only stores the three free variables:

```ts
export interface Gene {
  teacher: number;
  room: number;
  slot: number;
}
```

Each session also keeps a list of the teachers qualified for it and the rooms big enough for
its batch. Genes are only ever drawn from those lists, so qualification and capacity are
satisfied by construction and the algorithm only has to remove clashes.

---

## 5. Implementation

### 5.1 The algorithm engine

The engine lives in `src/ga/`, one file per step of the proposal:

| File | Responsibility |
|---|---|
| `problem.ts` | Encoding: builds the session list (Step 1) |
| `population.ts` | Random population initialisation (Step 2) |
| `fitness.ts` | Fitness evaluation (Step 3) |
| `selection.ts` | Tournament selection (Step 4) |
| `crossover.ts` | Single-point crossover (Step 5) |
| `mutation.ts` | Gene mutation (Step 6) |
| `engine.ts` | The evolutionary loop and termination (Step 7) |
| `repair.ts` | Targeted repair (our addition, §5.5) |
| `rng.ts` | Seeded random number generator (mulberry32) |

No optimisation, solver or genetic-algorithm library is used. `rng.ts` exists instead of
`Math.random()` so that every run is reproducible; the default seed is 42.

The parameters are those in the proposal, plus one of our own (`patience`):

```ts
export const CONFIG = {
  populationSize: 100,
  maxGenerations: 1000,
  crossoverRate: 0.8,
  mutationRate: 0.05,
  tournamentSize: 5,
  elitismRate: 0.2,
  /** Generations without improvement before stopping, once clash-free. */
  patience: 20,
  seed: 42,
};
```

### 5.2 Genetic operators

**Selection** is by tournament with k = 5. Roulette-wheel selection was considered and
rejected: because fitness is 1/(1+penalty), scores compress into a very narrow band once the
population is moderately good — a timetable with two clashes scores about 0.0047 and one with
three about 0.0032. Fitness-proportionate selection would be nearly blind at that resolution.
Tournament selection depends only on the *ordering* of fitness values, so it keeps full
selection pressure however compressed the scores become.

**Crossover** is single-point at rate 0.8, with the top 20% of each generation carried
forward unchanged as elites. Because gene *i* always describes session *i* (§4.3), splicing
two parents at any point still gives exactly one placement per session:

```ts
export function crossover(a: Chromosome, b: Chromosome, rng: Rng): Chromosome {
  const cut = 1 + rng.int(a.length - 1);
  return a.map((gene, i) => ({ ...(i < cut ? gene : b[i]) }));
}
```

**Mutation** applies per gene at rate 0.05 and reassigns the room, the time slot, or both —
the three cases the proposal names. New rooms come from the session's own list, so mutation
never produces a room that is too small:

```ts
const choice = rng.int(3);
if (choice !== 1) gene.room = rng.pick(session.rooms);
if (choice !== 0) gene.slot = rng.int(SLOTS);
```

### 5.3 Constraint addition

The proposal's Step 3 names teacher conflicts, room conflicts and capacity. Capacity is now
guaranteed by construction (§4.3). We added one hard constraint the proposal does not name:
**batch double-booking**. Without it, the algorithm readily produces timetables in which one
batch of students is in two rooms at the same time. Such a timetable passes every stated check
and is still useless.

### 5.4 Fitness function

Fitness is `1 / (1 + penalty)`, and each clash costs 100. Clashes are found in one pass:
every (teacher, slot), (room, slot) and (batch, slot) cell remembers which gene took it
first, and a gene landing on a taken cell is a clash. Both genes are recorded, so the repair
step knows exactly which genes to move. The cost is linear in the number of sessions rather
than comparing every pair.

The soft weights (0.3 per idle gap, 0.2 per unit of uneven spread) are small on purpose. A
realistic timetable always carries some soft penalty — around 8–10 on our data — and keeping
the total well below 100 means one clash always outweighs every soft penalty together. The
algorithm therefore removes all clashes first and polishes afterwards.

### 5.5 Targeted repair — our addition

The GA exactly as in proposal Steps 1–7 does find clash-free timetables, but slowly: it
removes most clashes quickly, then spends hundreds of generations on the last few, because
random mutation rarely hits the genes that are actually clashing (§7.3).

The fitness function already knows which genes clash. After mutation, repair takes up to 12
of those genes, tries 8 random placements for each (teacher, room and slot, drawn from the
session's lists), and keeps a change only if the total penalty falls. It can never make a
timetable worse, and it does nothing to a clash-free one.

A genetic algorithm combined with a local search step like this is known in the literature
as a **memetic algorithm**.

### 5.6 Termination — resolving an ambiguity in the proposal

Proposal Step 7 runs the loop "until a chromosome achieves a fitness score of 1.0". Taken
literally this almost never happens: fitness includes soft penalties, and a real timetable
always keeps a few (a teacher with one idle hour). Expected Outcome 2 resolves the ambiguity
by writing "a fitness score of 1.0 **(zero hard constraint violations)**".

The engine therefore stops when any of these holds:

1. fitness reaches 1.0;
2. the best timetable is clash-free and best fitness has not improved for 20 generations;
3. 1000 generations have run.

The metric reported in §7 is **generations and time to the first clash-free timetable**,
since that is when a usable result exists. Final fitness is typically 0.09–0.11.

### 5.7 User interface

The app is a single page. **Generate timetable** starts the run. After each generation the
engine yields to the browser (`setTimeout(0)`), so the chart updates live while the search
runs. The page shows:

- four stat tiles: generation, hard violations, best fitness and elapsed time;
- a line chart of hard violations and best fitness per generation;
- when the run ends, a summary line and the timetable as a plain HTML table (days × periods),
  with a view selector (by batch, teacher or room) and a dropdown to pick which one.

«Screenshot: the single page after a finished run — stat tiles, convergence chart and
timetable grid.»

---

## 6. Testing

### 6.1 Strategy

Eight automated tests in `src/ga/ga.test.ts`, run with `npm test` (Vitest). They cover the
encoding, the fitness function, the operators and one full run of the algorithm on the real
data.

### 6.2 Test cases

| # | Test | Expected | Result |
|---|---|---|---|
| 1 | Encoding makes one session per weekly lecture | 12 × 5 × 3 = 180 sessions | Pass |
| 2 | Sessions offer only qualified teachers and rooms that fit | Every listed teacher qualified, every room large enough | Pass |
| 3 | Clash-free timetable scores no hard violations | 0 violations; fitness = 1/(1+penalty) | Pass |
| 4 | Teacher clash detected and both genes flagged | 1 violation; genes 0 and 1 flagged | Pass |
| 5 | Room clash detected | 1 violation | Pass |
| 6 | Crossover keeps one gene per session, each from a parent | Same length; every gene from parent A or B | Pass |
| 7 | Mutation only uses valid values | Rooms from the session's list, slots in 0–35 | Pass |
| 8 | GA finds a clash-free timetable within 500 generations and 120 s | 0 hard violations, solved by generation 500, under 120 s | Pass |

---

## 7. Result Analysis

**Test environment:** Node.js 20 on the development Mac (macOS), single-threaded. Ten runs
with seeds 1–10, proposal default parameters.

### 7.1 NFR1 compliance

| Metric | Mean | Worst | Budget | Verdict |
|---|---:|---:|---:|:--|
| Generations to clash-free | 7.1 | 8 | 500 | **PASS** |
| Time to clash-free | 384 ms | 442 ms | 120,000 ms | **PASS** |
| Hard violations at end | 0 | 0 | 0 | **PASS** (10/10 runs) |

The full run, including soft polishing after the timetable is clash-free, took 74–160
generations and 3.3–6.8 seconds, ending with a soft penalty of 8.0–9.6. A usable timetable
exists long before the run finishes.

**This satisfies Expected Outcome 1** (zero double-bookings and capacity overflows) and
**Expected Outcome 2** (zero hard violations within 500 generations, well under 120 seconds).

### 7.2 Convergence behaviour

The best random timetable in the first generation has 58–65 hard violations across the ten
seeds. With the default seed 42, the best timetable has 50 violations at generation 1, is
clash-free at generation 7 (368 ms), and the run stops at generation 61 (about 2.7 s) with
fitness 0.0877.

The shape is typical of a GA on a constrained problem. Clashes fall steeply at first, and
each clash removed is worth 100 penalty units, so fitness jumps sharply when the last one
goes. After that the curve flattens: only soft gains remain, each worth a fraction of a unit,
and the run stops once 20 generations pass with no improvement.

«Screenshot: the live chart of hard violations and best fitness for seed 42.»

### 7.3 Effect of targeted repair

The same ten seeds with repair switched off — the plain proposal Steps 1–7:

| Variant | Solved | Generations to clash-free | Final soft penalty |
|---|:--:|---|---:|
| Proposal only (Steps 1–7) | 10/10 | 286, 445, 514, 308, 377, 289, 572, 316, 317, 364 (mean 378.8) | 27.3–35.9 |
| With repair (shipped) | 10/10 | mean 7.1, worst 8 | 8.0–9.6 |

The plain GA does solve this problem, but slowly, and in 2 of 10 runs it needs more than the
500 generations Expected Outcome 2 allows. Repair cuts generations-to-solution by about 50×,
makes Expected Outcome 2 hold on every run, and leaves far less soft penalty. Without repair
the population gets close, then mutation — changing about nine of 180 genes per child, chosen
blindly — rarely hits the few genes still clashing. Repair supplies exactly that directed
change.

### 7.4 Summary against the proposal's expected outcomes

| Expected outcome | Result |
|---|---|
| 1. Working application producing conflict-free timetables with zero double-bookings or capacity overflows | **Achieved** for the algorithm: capacity holds by construction and clashes reach 0 in every run. The application is a browser demo, not the full web system (§3.3). |
| 2. Custom GA in TypeScript reaching zero hard violations within 500 generations, well under 120 seconds | **Achieved.** Mean 7.1 generations and 384 ms over 10 seeds. |
| 3. Interactive multi-perspective timetable view with lecture/laboratory differentiation | **Partial.** Batch, teacher and room views; there are no labs to differentiate. |
| 4. Print-ready PDF and spreadsheet export | **Not implemented** (§3.3). |
| 5. Documented performance analysis | **Achieved** at the NFR1 size: §7.1–7.3. |
| 6. Report with UML diagrams, design, implementation and testing | **Achieved.** This document and `UML.md`. |

---

## 8. Conclusion and Future Work

### 8.1 Conclusion

The project delivers a Genetic Algorithm, written from scratch in TypeScript with no
optimisation library, that builds a clash-free weekly timetable for the proposal's
configuration in under half a second. Its seven stages follow the proposal and use the
proposal's parameters. The places where it departs from the specification — the added batch
constraint, the small soft weights, the termination rule and the targeted repair step — are
each documented in the code and justified in this report.

The main finding is §7.3: the textbook GA works, but it is slow on the last few clashes and
in some runs misses the 500-generation target. Adding a small, directed repair step makes it
about 50 times faster and reliable.

We deliberately reduced the scope to the algorithm and a single demonstration page. The
administrative features in the proposal (database, login, data entry, export) are not part of
this submission.

### 8.2 Limitations

1. **No completeness guarantee.** The algorithm cannot prove that no timetable exists; the
   only checks are that each course has a qualified teacher and each batch fits some room.
2. **Fixed data.** The college is defined in `src/data.ts`; changing it means editing code.
3. **Simplified problem.** No labs, room types, teacher availability or departments.
4. **Hand-tuned soft weights.** Chosen by hand, not configurable.
5. **Tested at one size.** Results are for the NFR1 configuration only.
6. **No mid-semester rescheduling.** Each run produces a fresh timetable.

### 8.3 Future work

**Restoring the administration features** from the proposal — a database, data-entry
screens, login and export — around the existing engine.

**Richer constraints**: laboratories needing two consecutive periods in a lab room, and
teacher availability.

**Minimal-perturbation rescheduling.** When one teacher becomes unavailable mid-semester, an
administrator needs the smallest set of changes, not a new timetable. This fits the current
design by adding a penalty for distance from the existing schedule.

**Larger instances**, with greedy seeding of the initial population and fitness evaluation in
a Web Worker.

---

## 9. References

[1] S. Even and Y. Itai, "On the complexity of timetable and multicommodity flow problems,"
*SIAM Journal on Computing*, vol. 5, no. 4, pp. 691–703, 1976.

[2] J. H. Holland, *Adaptation in Natural and Artificial Systems*. Ann Arbor, MI: University
of Michigan Press, 1975.

[3] D. E. Goldberg, *Genetic Algorithms in Search, Optimization, and Machine Learning*.
Reading, MA: Addison-Wesley, 1989.

[4] A. Colorni, M. Dorigo and V. Maniezzo, "Genetic algorithms and highly constrained
problems: The timetable case," in *Proc. 1st Int. Workshop on Parallel Problem Solving from
Nature*, Dortmund, Germany, pp. 55–59, 1990.

[5] D. Abramson, "Constructing school timetables using simulated annealing: Sequential and
parallel algorithms," *Management Science*, vol. 37, no. 1, pp. 98–113, 1991.

---

## Appendix A — Running the project

```bash
npm install
npm run dev      # open the page, press "Generate timetable"
npm test         # 8 tests
npm run build    # production build
```

All runs are seeded (default 42), so a given seed gives the same timetable every time.
