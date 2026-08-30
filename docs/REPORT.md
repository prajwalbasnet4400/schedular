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

The Automated College Timetable Generator is a web-based application that addresses this
challenge using a Genetic Algorithm to compute optimal, conflict-free weekly class schedules.
The system accepts institutional data — instructor availability, course loads, room capacities
and batch sizes — and produces a complete timetable satisfying all hard constraints while
optimising soft preferences such as minimising instructor idle gaps and balancing room
utilisation.

### 1.2 Scope

The project moves well beyond basic CRUD operations by implementing a custom-coded Genetic
Algorithm as its core scheduling engine, fulfilling the syllabus requirement for algorithmic
depth and original program module development. It is built on a three-tier architecture with
React and TypeScript on the frontend and Node.js with Express on the backend. A PostgreSQL
database stores institutional data while the evolutionary computation engine runs server-side.
The resulting timetable is presented through an interactive data grid supporting filtering by
teacher, batch and room, alongside export functionality for PDF and Excel formats.

### 1.3 Summary of achievement

On the benchmark configuration specified in the project proposal — six programmes, thirty
courses, twenty teachers and fifteen rooms, amounting to 204 class sessions — the system
produces a timetable with **zero hard-constraint violations in a mean of 753 milliseconds
and 13.2 generations**, across ten independent seeded runs. The requirement (NFR1) allowed
120,000 milliseconds; the expected outcome allowed 500 generations. Both are met with
substantial margin, and the measurements are reproducible with a single command.

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
4. Build an interactive frontend displaying the timetable in a filterable data grid with
   teacher, room and batch perspectives.
5. Implement an export module producing PDF and Excel output.
6. Evaluate the algorithm's performance: convergence behaviour, fitness progression and
   completion time across varying input sizes.

All six objectives were met. Section 7 reports the measurements for objective 6.

---

## 3. Requirement Analysis

### 3.1 Functional requirements

| ID | Requirement | Status |
|---|---|---|
| FR1 | Administrator interface for CRUD on departments, teachers (with expertise and availability), courses, rooms, batches and time slots | Implemented — seven screens |
| FR2 | Genetic Algorithm engine enforcing hard constraints: no teacher double-booking, no room double-booking, no capacity violation | Implemented — plus four further hard constraints (§5.3) |
| FR3 | Interactive grid with filtering by teacher, batch, room and department; colour coding for lecture and laboratory sessions | Implemented — AG-Grid, three views |
| FR4 | Real-time feedback during generation showing generation number and fitness score | Implemented — server-sent events, live chart |
| FR5 | Export to PDF and Excel with separate pages/sheets per batch, teacher and room | Implemented — six export combinations |
| FR6 | Authentication with role-based access control distinguishing administrators from viewers | Implemented — JWT, enforced server-side |

### 3.2 Non-functional requirements

| ID | Requirement | Status |
|---|---|---|
| NFR1 | Conflict-free timetable for 6 programmes / 30 courses / 20 teachers / 15 rooms within 120 seconds | **Met** — 753 ms mean, 800 ms worst (§7.1) |
| NFR2 | Responsive interface from 768 px (tablet) to desktop | Met — CSS grid layout with a breakpoint at 1024 px |
| NFR3 | Persistence in a relational database with foreign key constraints and validation | Met — PostgreSQL 16, every relation a real FK |
| NFR4 | Meaningful error messages when input data makes a feasible schedule impossible | Met — pre-flight feasibility analysis (§5.5) |

### 3.3 Constraint specification

**Hard constraints** — a timetable violating any of these is unusable:

| Constraint | Penalty weight |
|---|---|
| Teacher assigned to two sessions in one time slot | 100 |
| Room assigned to two sessions in one time slot | 100 |
| Batch assigned to two sessions in one time slot | 100 |
| Room capacity less than batch student count | 100 |
| Laboratory session assigned to a lecture hall | 100 |
| Instructor scheduled outside declared availability | 100 |
| Instructor assigned a course they are not qualified for | 100 |

**Soft constraints** — desirable, optimised after hard constraints are satisfied:

| Constraint | Penalty weight |
|---|---|
| Instructor idle gap (free period between taught periods on one day) | 0.3 |
| Uneven distribution of a batch's classes across the week | 0.2 |
| Same subject in consecutive periods for one batch | 0.2 |
| Room utilisation imbalance | 0.1 |

The rationale for the fractional soft weights is a genuine experimental finding and is
discussed in §5.4.

---

## 4. System Design

### 4.1 Architecture

The system follows a three-tier client-server architecture:

- **Presentation layer** — React 18 with TypeScript, AG-Grid Community for the timetable
  grid, Recharts for the convergence visualisation.
- **Business logic layer** — Node.js 20 with Express, hosting the REST API and the Genetic
  Algorithm engine.
- **Data layer** — PostgreSQL 16, accessed through the Prisma ORM.

A fourth element sits outside the tiers: `packages/shared`, a workspace containing entity
type definitions, Zod validation schemas and the algorithm's constants. Both the frontend and
the backend import it. This is the concrete realisation of the design argument that Node.js
was chosen so that a single language could serve the whole stack: the client forms and the
Express middleware validate against literally the same schema objects, so the two validations
cannot drift apart.

See [`UML.md`](UML.md) for the use case, class, entity-relationship, sequence, activity and
component diagrams.

### 4.2 Data model

Seven core entities, following proposal section 4.3.4: Department, Program, Course,
Instructor, Room, Batch and MeetingTime, plus InstructorAvailability as an explicit join
table, and ScheduleRun / ScheduleAssignment to persist results.

`ScheduleRun` stores the parameter configuration alongside the outcome. This is a deliberate
design decision: it converts the comparative parameter analysis promised by the project's
expected outcomes from a manually maintained spreadsheet into a database query, and it means
any past run can be reproduced exactly from its stored seed.

### 4.3 Chromosome encoding

Each candidate timetable is an array of genes, with one gene per required class session. A
gene encodes the tuple (Course, Teacher, Room, Time Slot, Batch). If a course requires three
lectures per week, three separate genes are created.

The implementation adds one refinement to this scheme. The requirement list — what must be
placed — is computed once from the institutional data and never changes during a run. Because
it is fixed and ordered, gene *i* of every chromosome always answers the same question:
"where does requirement *i* go?" Consequently only the three free variables need to be
stored per gene (instructor, room, start slot), and the course, batch and session type are
read from the requirement at that index.

This has an important consequence for crossover, discussed in §5.2.

A laboratory session is represented as a **single gene with a duration of two periods**, not
as two independent genes. Contiguity therefore holds by construction: no operator can
separate a lab's two hours, and no repair pass is needed.

---

## 5. Implementation

### 5.1 The algorithm engine

The engine lives in `server/src/ga/`, with one module per stage:

| Module | Responsibility |
|---|---|
| `rng.ts` | Seedable pseudo-random generator (mulberry32) |
| `types.ts` | `SessionRequirement`, `Gene`, `Chromosome`, `Individual` |
| `context.ts` | Builds the indexed problem instance; session expansion (Step 1) |
| `population.ts` | Random population initialisation (Step 2) |
| `fitness.ts` | Fitness evaluation (Step 3) |
| `selection.ts` | Tournament selection (Step 4) |
| `crossover.ts` | Single-point crossover (Step 5) |
| `mutation.ts` | Gene mutation (Step 6) |
| `engine.ts` | The evolutionary loop and termination (Step 7) |
| `repair.ts` | Targeted local search (documented refinement) |
| `feasibility.ts` | Pre-flight impossibility detection (NFR4) |
| `decode.ts` | Chromosome to assignment tuples |

No external optimisation, solver or genetic-algorithm library is used. The only reason
`rng.ts` exists rather than a call to `Math.random()` is reproducibility: a performance
comparison that an examiner cannot reproduce demonstrates nothing.

### 5.2 Genetic operators

**Selection** is by tournament with k = 5. Roulette-wheel selection was considered and
rejected for a specific reason: because fitness is 1/(1+penalty), scores compress into a very
narrow band once the population is even moderately good — a chromosome with two violations
scores 0.00498 and one with three scores 0.00332. Fitness-proportionate selection would be
nearly blind at that resolution. Tournament selection depends only on the *ordering* of
fitness values, never their spacing, so it retains full selection pressure however compressed
the scores become.

**Crossover** is single-point at rate 0.8, with the top 20% of each generation carried
forward unchanged as elites. The offspring is always well-formed and requires no repair
operator — a direct consequence of the encoding described in §4.3, since splicing two parents
at any point still yields exactly one placement per requirement.

**Mutation** applies per gene at rate 0.05, reassigning the room, the time slot, or both. The
implementation adds instructor reassignment as a fourth case: several courses have three
qualified teachers, and without the ability to move a session to a different one the algorithm
can resolve a teacher clash only by moving the session in time — a much narrower escape route.
Every replacement is drawn from the requirement's pre-computed eligible sets, so mutation can
never produce an unqualified teacher, an undersized room or a lab in a lecture hall.

### 5.3 Constraint additions

Two hard constraints beyond those named in the proposal proved necessary during
implementation, and are documented here rather than folded in silently:

**Batch double-booking.** The proposal names teacher conflict, room conflict and capacity.
Without a batch conflict check, the algorithm readily produces timetables in which one batch
of students is scheduled into two rooms simultaneously. Such timetables satisfy every stated
constraint and are nonetheless useless.

**Instructor availability and qualification.** These are captured in the data model per FR1
but are not listed among the hard constraints in section 4.3.2 of the proposal. Enforcing them
is the only thing that makes the availability matrix meaningful.

### 5.4 Fitness weighting — an experimental finding

The initial implementation assigned soft-constraint weights of 3, 2, 2 and 1. The algorithm
**stalled at six hard-constraint violations** by generation 450 and did not improve for the
remaining 550 generations.

The cause was structural, not a coding defect. A realistic timetable carries roughly 190
unavoidable soft violations — a teacher with one idle hour is an ordinary timetable, not a
defective one. At those weights the soft term contributed approximately 40% of the total
penalty, so a move that eliminated a genuine double-booking could be rejected because it
introduced a handful of idle gaps. The hard-constraint signal was being drowned by soft noise.

Rescaling the soft weights so that their total remains comfortably below the cost of a
**single** hard violation (100) restored the intended lexicographic behaviour: eliminate every
conflict first, then polish. With weights of 0.3, 0.2, 0.2 and 0.1, the total soft penalty on
a converged timetable is around 11, well under 100.

### 5.5 Feasibility analysis (NFR4)

A genetic algorithm cannot distinguish "no solution exists" from "I have not found the
solution yet" — both present as a population that stops improving. Left unaided it would
exhaust its generation budget and report a low fitness score, telling the administrator
nothing about which record to correct.

`feasibility.ts` therefore checks necessary conditions before the search begins: whether the
required session count exceeds available room-periods, whether every course has at least one
qualified instructor, whether every batch fits in some room of the right type, whether any
batch's weekly load exceeds the number of slots in the week, and whether any sole-qualified
instructor is asked for more periods than they have declared available. Failing any of these
is a proof of impossibility, reportable immediately in the administrator's own vocabulary.

This check found a genuine defect in our own seed data during development: laboratory capacity
had been set at 40 while the BBA section A cohort numbers 55. The system refused to run and
reported *"No laboratory can seat batch BBA Sem 5A (55 students) for MGT315. Add a laboratory
with capacity of at least 55."* The data was corrected; the check was not weakened.

### 5.6 Performance engineering

A naive fitness function compares every gene with every other to detect clashes. At benchmark
scale that is roughly 204² comparisons × 100 population × 1000 generations — approximately
four billion operations, far outside the 120-second budget.

The implementation instead **buckets** occupancy: each (resource, slot) pair indexes into a
counter array, and a clash is recorded when a bucket already occupied is entered. Each gene is
touched once, so a full evaluation is linear in the number of scheduled periods. The scratch
buffers are allocated once and cleared in constant time using a generation-stamp technique,
which avoids allocating 100,000 large typed arrays over a benchmark run.

### 5.7 Live progress streaming (FR4)

The evolutionary loop is CPU-bound and synchronous, and Node.js is single-threaded. Run
straight through, it would occupy the process for the entire computation and every queued
progress event would be delivered in one burst after the search had already finished — the
"live" chart would in fact be a replay.

The loop is therefore implemented as a **generator** that yields once per generation. The
synchronous `run()` drains it immediately, for the CLI, the benchmarks and the tests; the
asynchronous `runAsync()` drains it while returning control to the event loop every few
generations, so Express can flush each progress event over the open server-sent-events
connection while the search is still running. There is a single implementation of Steps 2–7,
so the two paths cannot diverge.

Server-sent events were chosen over WebSockets because the traffic is strictly
one-directional, requires no additional dependency or protocol upgrade, and reconnects
automatically in the browser.

### 5.8 Refinements beyond the proposal

The algorithm exactly as specified in proposal Steps 1–7 was implemented first and behaves as
the literature predicts: it removes violations rapidly at the outset, then plateaus. Two
additions resolve the plateau, and both can be switched off — which is how the ablation study
in §7.4 is produced.

**Random immigrants.** After 50 generations without improvement, the weakest individuals are
replaced with freshly randomised chromosomes. A converged population has no diversity left for
crossover to exploit; immigrants reintroduce it. Elites are never displaced, so the best
solution found so far is never at risk.

**Targeted repair.** Once converged, mutation is the only source of new material and mutation
is blind: with 204 genes at rate 0.05, about ten genes change per offspring, chosen without
regard to which genes are causing the remaining clashes. The fitness evaluator already knows
which genes collided while it was counting violations, so the repair operator asks it, then
tries a bounded number of alternative placements for those specific genes and keeps a change
only if the total penalty falls. It is a strict improvement filter — it cannot make a
chromosome worse — and it leaves conflict-free chromosomes untouched.

The resulting hybrid of a genetic algorithm with local search is known in the literature as a
**memetic algorithm**.

### 5.9 Termination — resolving an ambiguity in the proposal

Proposal section 4.3.2 Step 7 states the loop runs "until a chromosome achieves a fitness
score of 1.0". Taken literally, that condition can never be satisfied on real data: fitness is
1/(1+total_penalty) and total_penalty includes soft constraints, of which any realistic
timetable retains a few. The loop would always run its full generation budget.

Expected Outcome 2 of the same proposal resolves the ambiguity, writing "a fitness score of
1.0 **(zero hard constraint violations)**" — equating the two. Zero hard violations is
therefore the intended goal, and the implementation terminates once that has been reached and
the soft score has ceased improving. The literal 1.0 test is retained for the degenerate case
where a dataset admits a flawless timetable, and there is a unit test confirming it fires.

Accordingly, the metric reported throughout §7 is **time to the first conflict-free
timetable**, since that is the moment the administrator has a usable result.

---

## 6. Testing

### 6.1 Strategy

Sixty-five automated tests across three levels, deliberately arranged so that no layer trusts
another.

| Level | Count | Coverage |
|---|---|---|
| Unit and property-based | 43 | Every genetic operator, every constraint category, the RNG, the encoding |
| Integration | 22 | HTTP endpoints against a real database: auth, RBAC, CRUD, generation, export |
| Property-based | included above | 25 independent searches, output re-verified directly |

### 6.2 Selected test cases

| # | Test | Expected | Result |
|---|---|---|---|
| 1 | Fitness of a flawless timetable | Exactly 1.0 | Pass |
| 2 | Fitness formula equals 1/(1+penalty) | Identity holds to 12 decimal places | Pass |
| 3 | Teacher double-booking detected | Count > 0 | Pass |
| 4 | Room double-booking detected | Count > 0 | Pass |
| 5 | Batch double-booking detected | Count > 0 | Pass |
| 6 | Room capacity overflow detected | Count equals session count | Pass |
| 7 | Lab in a lecture hall detected | Count = 1 | Pass |
| 8 | Instructor outside availability detected | Count equals session count | Pass |
| 9 | Unqualified instructor detected | Count equals affected sessions | Pass |
| 10 | Both periods of a two-hour lab checked for clashes | Conflict found in second period | Pass |
| 11 | Idle gaps counted, leading/trailing free periods excluded | 2 for periods 1 and 4; 0 for adjacent | Pass |
| 12 | Seeded RNG reproducible | Identical 100-value sequences | Pass |
| 13 | Population initialisation respects eligible sets | 200 chromosomes, all genes valid | Pass |
| 14 | Tournament selection applies pressure | Mean winner fitness > population mean | Pass |
| 15 | Larger k applies more pressure | mean(k=10) > mean(k=2) | Pass |
| 16 | k = 1 applies no pressure | Mean winner ≈ population mean | Pass |
| 17 | Crossover preserves chromosome length | Length unchanged over 100 trials | Pass |
| 18 | Crossover invents no genes | Every gene traceable to a parent | Pass |
| 19 | Crossover does not alias parents | Parents unchanged after child mutated | Pass |
| 20 | Mutation stays within eligible sets | 500 rounds at rate 1.0, all valid | Pass |
| 21 | Mutation never starts a lab in the final period | 500 rounds, invariant holds | Pass |
| 22 | Engine reaches fitness 1.0 when attainable | perfect = true | Pass |
| 23 | Engine solves a contended medium instance | 0 hard violations | Pass |
| 24 | Same seed yields identical timetable | Chromosomes deep-equal | Pass |
| 25 | Best fitness never decreases (elitism) | Monotonic across generations | Pass |
| 26 | Lab occupies consecutive periods of one day | Slot difference = 1, same day | Pass |
| 27 | **Property: no double-booking in any successful run** | 25 seeds, all outputs clean | Pass |
| 28 | Fitness counter agrees with naive O(n²) recount | Agreement on existence of violations | Pass |
| 29 | Unknown email and wrong password give identical errors | No account enumeration | Pass |
| 30 | Viewer forbidden from create / update / delete | 403 on all three | Pass |
| 31 | Viewer forbidden from running the algorithm | 403 | Pass |
| 32 | Unauthenticated request rejected | 401 on every entity endpoint | Pass |
| 33 | Duplicate unique code reported as conflict | 409 with a readable message | Pass |
| 34 | Referenced record cannot be deleted | 409 | Pass |
| 35 | Invalid input rejected with per-field messages | 400 with field details | Pass |
| 36 | End-to-end generation produces a clean timetable | 0 hard violations, verified independently | Pass |
| 37 | Export produces valid PDF and XLSX in all three views | Correct magic bytes, six combinations | Pass |
| 38 | Batch export produces one worksheet per batch | 12 uniquely named worksheets | Pass |

### 6.3 A defect found by testing

Test 38 exists because of a real bug. Every programme in the dataset runs a section labelled
"Semester 5A", and batch labels initially omitted the programme code. Excel forbids duplicate
worksheet names, so the batch export failed with HTTP 500. The same ambiguity made the
timetable screen's filter dropdown display several indistinguishable "Semester 5A" entries.

The fix was to carry the programme code into every batch label — correcting the export and the
user interface together — with a uniqueness guard in the export as a second line of defence.
This is recorded here because the panel is entitled to know what testing actually caught.

---

## 7. Result Analysis

All measurements below were produced by `npm run bench`, which writes raw data to
`benchmarks/results/*.csv`. Every run is seeded, so the figures are reproducible on the same
hardware.

**Test environment:** Node.js v20.19.5, macOS (darwin arm64), single-threaded execution.

### 7.1 NFR1 compliance

Ten independent seeded runs on the exact configuration named in NFR1 — six programmes, thirty
courses, twenty teachers, fifteen rooms — comprising 204 class sessions occupying 228 periods.
All parameters at the proposal defaults.

| Seed | Conflict-free at generation | Time to conflict-free (ms) | Total generations | Total time (ms) | Final fitness | Hard | Soft |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 11 | 12 | 671 | 365 | 18,797 | 0.084746 | 0 | 61 |
| 23 | 14 | 796 | 308 | 16,172 | 0.075188 | 0 | 65 |
| 37 | 14 | 799 | 410 | 21,508 | 0.084746 | 0 | 60 |
| 53 | 13 | 737 | 416 | 21,831 | 0.086207 | 0 | 59 |
| 71 | 14 | 795 | 380 | 20,248 | 0.077519 | 0 | 62 |
| 89 | 13 | 756 | 384 | 20,115 | 0.089286 | 0 | 52 |
| 101 | 13 | 739 | 364 | 19,123 | 0.078740 | 0 | 62 |
| 113 | 14 | 800 | 316 | 16,591 | 0.081967 | 0 | 60 |
| 131 | 13 | 743 | 333 | 17,234 | 0.084034 | 0 | 58 |
| 149 | 12 | 695 | 398 | 21,221 | 0.073529 | 0 | 67 |

**Summary**

| Metric | Mean | Median | Worst | Budget | Verdict |
|---|---:|---:|---:|---:|:--|
| Time to conflict-free timetable | 753 ms | 750 ms | 800 ms | 120,000 ms | **PASS** (150× margin) |
| Generations to conflict-free | 13.2 | 13 | 14 | 500 | **PASS** (36× margin) |
| Hard-constraint violations | 0 | 0 | 0 | 0 | **PASS** (10/10 runs) |

Every run terminated with reason `soft-converged`: a conflict-free timetable was found within
fourteen generations, after which the algorithm continued refining soft preferences until
those too stopped improving. The wide gap between "time to conflict-free" (under one second)
and "total time" (16–22 seconds) is entirely soft-constraint polishing, and is optional — the
administrator has a usable timetable long before the run completes.

**This satisfies Expected Outcome 1** (zero double-bookings and capacity overflows) and
**Expected Outcome 2** (fitness reaching zero hard-constraint violations within 500
generations, with generation time well under 120 seconds).

### 7.2 Convergence behaviour

A representative run, sampled every five generations:

| Generation | Best fitness | Average fitness | Hard violations | Soft violations |
|---:|---:|---:|---:|---:|
| 1 | 0.000094 | 0.000075 | 106 | 228 |
| 5 | 0.000216 | 0.000159 | 46 | 165 |
| 10 | 0.000883 | 0.000527 | 11 | 143 |
| 15 | 0.030864 | 0.005446 | **0** | 144 |
| 20 | 0.035842 | 0.013496 | 0 | 126 |
| 55 | 0.048544 | — | 0 | 93 |
| 434 (final) | 0.082645 | — | 0 | 60 |

The shape is characteristic of a genetic algorithm on a heavily constrained problem. Hard
violations fall steeply — 106 to 11 in ten generations — because early in the search almost
any change is an improvement and selection pressure is strong. The step from generation 10 to
15, where the last eleven conflicts are eliminated, produces a 35-fold jump in fitness,
because removing a hard violation is worth 100 penalty units against a total that is by then
small.

After generation 15 the curve flattens and slowly climbs: with no conflicts left, the only
remaining gains are soft, and each is worth a fraction of a penalty unit. Soft violations fall
from 144 to 60 over the remaining generations — a genuine improvement in timetable quality
(fewer idle hours for teachers, better spread for students) that is invisible in the hard
constraint count.

### 7.3 Parameter sweep

Twenty-seven configurations, three seeds each, generation ceiling 400. Every configuration
solved every run, so the discriminating metrics are speed of convergence and final soft
quality.

| Population | Mutation | Crossover | Mean generations to solve | Mean ms to solve | Mean final fitness |
|---:|---:|---:|---:|---:|---:|
| 50 | 0.01 | 0.60 | 10.0 | 278 | 0.171506 |
| 50 | 0.01 | 0.80 | 10.0 | 273 | 0.169078 |
| 50 | 0.01 | 0.95 | 10.3 | 283 | 0.172551 |
| 50 | 0.05 | 0.60 | 12.3 | 357 | 0.073295 |
| 50 | 0.05 | 0.80 | 14.0 | 403 | 0.071937 |
| 50 | 0.05 | 0.95 | 15.0 | 430 | 0.075766 |
| 50 | 0.10 | 0.60 | 24.0 | 726 | 0.035244 |
| 50 | 0.10 | 0.80 | 31.0 | 917 | 0.036394 |
| 50 | 0.10 | 0.95 | 29.0 | 869 | 0.029934 |
| 100 | 0.01 | 0.60 | 9.3 | 514 | 0.173492 |
| 100 | 0.01 | 0.80 | 10.0 | 562 | **0.180814** |
| 100 | 0.01 | 0.95 | 10.3 | 590 | 0.173093 |
| 100 | 0.05 | 0.60 | 12.0 | 735 | 0.083965 |
| 100 | 0.05 | 0.80 | 13.3 | 756 | 0.081560 |
| 100 | 0.05 | 0.95 | 14.3 | 815 | 0.077146 |
| 100 | 0.10 | 0.60 | 28.0 | 1,659 | 0.036114 |
| 100 | 0.10 | 0.80 | 29.7 | 1,764 | 0.036520 |
| 100 | 0.10 | 0.95 | 35.7 | 2,134 | 0.035644 |
| 200 | 0.01 | 0.60 | 9.7 | 1,069 | 0.184145 |
| 200 | 0.01 | 0.80 | **9.3** | 1,034 | 0.187729 |
| 200 | 0.01 | 0.95 | 10.7 | 1,325 | 0.184145 |
| 200 | 0.10 | 0.95 | 40.3 | 4,953 | 0.033639 |

Three findings, in order of importance:

**1. Mutation rate dominates, and the proposal's default is not optimal.** This is the
clearest result in the study. Moving from 0.05 to 0.01 improves both metrics substantially:
at population 100 and crossover 0.8, convergence improves from 13.3 to 10.0 generations, and
final fitness more than doubles from 0.0816 to 0.1808. Moving the other way, to 0.10, is
markedly worse on both counts — 29.7 generations and a fitness of 0.0365.

The mechanism is that mutation is a disruptive operator. At 204 genes, a rate of 0.10 changes
about twenty genes per offspring, which destroys good partial solutions faster than selection
can consolidate them. Since the targeted repair operator (§5.8) already supplies the directed
diversity that high mutation was compensating for, a low background rate is sufficient.

We have retained 0.05 as the shipped default so that the running system matches the value
specified in the proposal, and report 0.01 as an empirical improvement. Changing it is a
one-field edit on the Generate screen.

**2. Crossover rate barely matters.** Across all populations and mutation rates, varying
crossover between 0.6 and 0.95 changes convergence by roughly one generation. This is not the
null result it appears: it indicates that in this problem, progress comes predominantly from
mutation and repair rather than from recombination — plausible, since two conflict-free
partial timetables recombined at an arbitrary point frequently reintroduce clashes at the
seam.

**3. Larger populations converge in fewer generations but not in less time.** Population 200
reaches a solution in 9.3 generations against 10.0 for population 100, but takes 1,034 ms
against 562 ms, because each generation costs twice as much to evaluate. Population 50 is the
fastest in wall-clock terms at this problem size. The proposal's default of 100 is a
reasonable middle choice and is retained.

### 7.4 Scalability

Four instances of increasing size, three seeds each, generation ceiling 600. The search space
column is log₁₀ of the product of each gene's option count — the number of distinct
timetables the algorithm is choosing between.

| Instance | Programmes | Courses | Batches | Instructors | Rooms | Sessions | Periods | Search space | Solved | Mean generations | Mean time to solve |
|---|---:|---:|---:|---:|---:|---:|---:|---:|:--:|---:|---:|
| small | 2 | 10 | 2 | 8 | 6 | 34 | 38 | 10^93 | 3/3 | 2.0 | 18 ms |
| **medium (NFR1)** | 6 | 30 | 12 | 20 | 15 | 204 | 228 | 10^639 | 3/3 | 13.3 | 792 ms |
| large | 8 | 48 | 16 | 30 | 22 | 320 | 352 | 10^1060 | 3/3 | 46.0 | 4,275 ms |
| stress | 10 | 60 | 30 | 45 | 32 | 600 | 660 | 10^2082 | **0/3** | — | — |

The search-space figures make the NP-hardness argument concrete rather than abstract. The
benchmark instance alone admits roughly 10^639 candidate timetables; exhaustive enumeration is
not merely slow but physically impossible, since the observable universe contains on the order
of 10^80 atoms. Reaching a conflict-free member of that space in thirteen generations is the
result worth stating.

Cost grows faster than input size: sessions increase 1.6× from medium to large, but time to
solve increases 5.4×. Two effects compound. Each generation costs more, because fitness
evaluation is linear in the number of periods. And more generations are needed, because a
larger instance is more tightly constrained — more sessions compete for the same 36 weekly
slots, so conflicts are harder to resolve without creating new ones.

**The stress instance did not converge within 600 generations, in any of three runs.** This is
reported as measured. The instance is feasible in principle — 660 required periods against
1,152 available room-periods, and no batch or instructor is oversubscribed — but the algorithm
did not find a conflict-free arrangement within the budget, plateauing instead with a small
number of residual violations.

Two honest observations follow. First, this is well beyond the scale NFR1 specifies: 600
sessions across 30 batches is roughly three times the benchmark configuration and larger than
any single Nepali college affiliated to Tribhuvan University would schedule as one unit.
Second, it marks a real ceiling in the current implementation rather than a mere budget
shortfall, and §8.2 records the two changes most likely to raise it.

### 7.5 Ablation of the documented refinements

Five seeds per variant, generation ceiling 500, on the benchmark instance. This measures the
contribution of the two additions described in §5.8.

| Variant | Repair | Immigrants | Solved | Mean generations to solve | Mean ms to solve | Mean final hard violations |
|---|:--:|:--:|:--:|---:|---:|---:|
| Proposal only (Steps 1–7) | off | off | **0/5** | — | — | 6.40 |
| Plus random immigrants | off | on | **0/5** | — | — | 6.40 |
| Plus targeted repair | on | off | **5/5** | 13.4 | 787 ms | 0.00 |
| Both (shipped default) | on | on | **5/5** | 13.4 | 789 ms | 0.00 |

This is the most consequential result in the study, and it should be stated plainly:

**The algorithm exactly as specified in the proposal does not solve the benchmark instance.**
Across five independent seeds it plateaued at an average of 6.4 hard-constraint violations and
never recovered within 500 generations. The proposal's Steps 1–7 are a correct and faithful
description of a genetic algorithm; they are simply not sufficient for this problem at this
scale.

**Targeted repair is the single change that makes the system work.** Adding it takes the solve
rate from 0/5 to 5/5, in a mean of 13.4 generations. Random immigrants, by contrast,
contribute nothing measurable: 0/5 without repair, and no improvement in generations or time
when added alongside it.

The explanation is that the two operators address different failure modes, and only one of
them is the operative failure here. Immigrants restore *population diversity*, which helps
when a population has collapsed onto a single genotype. Repair supplies *directed* change,
which is what is needed when the population is diverse enough but mutation is too blind to
find the few genes causing the remaining conflicts — with 204 genes and a 0.05 rate, roughly
ten genes change per offspring, chosen without regard to which are actually clashing. The
measurements say the second problem is the binding one.

Random immigrants are retained in the shipped default because they cost nothing measurable
(789 ms against 787 ms) and provide insurance against a different failure mode on datasets
unlike our benchmark. That is a judgement, not a result, and it is recorded as such.

### 7.6 Summary against the proposal's expected outcomes

| Expected outcome | Result |
|---|---|
| 1. Fully functional web application producing conflict-free timetables with zero double-bookings or capacity overflows | **Achieved.** Verified by property-based tests over 25 independent runs and by direct re-inspection of persisted output. |
| 2. Custom GA in TypeScript reaching zero hard violations within 500 generations, well under 120 seconds | **Achieved.** 13.2 generations and 753 ms mean over 10 seeds — 36× and 150× inside the respective budgets. |
| 3. Interactive multi-perspective timetable view with lecture/laboratory differentiation | **Achieved.** AG-Grid, three views, filtering, colour coding. |
| 4. Print-ready PDF and spreadsheet export | **Achieved.** Six export combinations, one page or worksheet per entity. |
| 5. Documented performance analysis: convergence graphs, parameter comparison, time against input size | **Achieved.** §7.1–7.5, all regenerable from `npm run bench`. |
| 6. Comprehensive report with UML diagrams, design, implementation and testing | **Achieved.** This document and `UML.md`. |

---

## 8. Conclusion and Future Work

### 8.1 Conclusion

The project delivers a working web application that reduces college timetable construction
from a two-to-three-week manual process to a sub-second computation, on the exact
configuration the proposal specified. All six functional and all four non-functional
requirements are met, and the two headline performance targets are met with margins of 36×
and 150×.

The core contribution is a Genetic Algorithm written from scratch in TypeScript, with no
optimisation library of any kind. Its seven stages follow the proposal precisely, and the
three places where the implementation departs from or extends the specification — the added
batch-conflict constraint, the rescaled soft weights, and the targeted repair operator — are
each documented in the code, justified in this report, and quantified in §7.5.

The most valuable finding of the work is the one recorded in §7.5: the textbook genetic
algorithm, implemented faithfully, does not solve this problem. It converges to within a
handful of violations and stops. What closes that final gap is hybridisation with a directed
local search, and the measured difference between the two is the difference between a system
that works and one that does not. The parameter sweep produced a second finding of the same
character — that the mutation rate specified in the proposal is measurably suboptimal for this
problem, and that 0.01 converges faster and yields better timetables than 0.05.

Both findings are consequences of having built the benchmarking apparatus rather than
asserting the performance claims, and that is the methodological lesson we take from the
project.

### 8.2 Limitations

1. **No completeness guarantee.** The algorithm cannot prove that no timetable exists. The
   feasibility checker detects only the necessary conditions implemented in §5.5.
2. **A scalability ceiling below 600 sessions.** §7.4 records the failure honestly. Raising it
   most likely requires seeding the initial population with a greedy construction heuristic
   rather than at random, and parallelising fitness evaluation across worker threads.
3. **Hand-tuned soft weights.** Chosen empirically rather than derived, and not configurable
   per institution.
4. **Fixed two-period laboratories.** The encoding supports arbitrary durations; the user
   interface does not expose the setting.
5. **No mid-semester rescheduling.** Regeneration produces a fresh timetable rather than
   minimally perturbing the existing one.
6. **Single-tenant.** One deployment serves one institution.

### 8.3 Future work

**Minimal-perturbation rescheduling** is the most valuable extension. When one instructor
becomes unavailable in week eight, an administrator needs the smallest set of changes that
restores feasibility — not a completely different timetable that invalidates every printed
copy. This is expressible within the current architecture by adding a penalty term for
distance from the existing schedule and seeding the population with it.

**Greedy population seeding.** Initialising with a graph-colouring or largest-degree-first
heuristic instead of at random would start the search from a far better region and is the most
promising route past the scalability ceiling in §7.4.

**Parallel fitness evaluation** across `worker_threads`. Evaluation is the dominant cost and is
embarrassingly parallel across a population.

**Per-institution constraint configuration**, so that soft-constraint weights and the hard
constraint set can be adjusted without code changes.

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

## Appendix A — Reproducing the results

```bash
npm run db:up && npm run setup      # database and seed data
npm test                            # 65 tests
npm run bench:nfr1                  # §7.1  (~3 minutes)
npm run bench:sweep                 # §7.3  (~18 minutes)
npm run bench:scale                 # §7.4  (~8 minutes)
npm run bench:ablation              # §7.5  (~10 minutes)
```

Raw data is written to `benchmarks/results/*.csv`. All runs are seeded; figures are
reproducible on equivalent hardware.
