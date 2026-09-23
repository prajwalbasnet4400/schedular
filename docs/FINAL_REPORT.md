<!--
  Print/Word layout notes for whoever converts this to the college template:
    * Every "---" is a page break in the printed report.
    * Front matter (cover page to List of Abbreviations) is numbered i, ii, iii …
      Chapter 1 restarts at Arabic 1.
    * Headings map to Word styles: "# " -> Title, "## " -> Heading 1,
      "### " -> Heading 2, "#### " -> Heading 3.
    * Items in «guillemets» must be filled in by hand before printing.
-->

<div align="center">

«College logo»

# Tribhuvan University
## Institute of Science and Technology

### Final Project Report
#### On
# Automated College Timetable Generator
#### Using a Genetic Algorithm

**Submitted to**
Department of Computer Application
Academia International College
Gwarko, Lalitpur

*In partial fulfilment of the requirements for the*
*Bachelor of Science in Computer Science and Information Technology*
*(CACS452 — Project III, Seventh Semester)*

**Submitted by**
Prajwal Basnet («symbol number»)
Shekhar Paudel («symbol number»)

«Month, Year»

**Under the Supervision of**
«Supervisor Name»

</div>

---

<div align="center">

«College logo»

# Tribhuvan University
## Institute of Science and Technology
## Academia International College

# SUPERVISOR'S RECOMMENDATION

</div>

I hereby recommend that this project prepared under my supervision by **Prajwal Basnet** and
**Shekhar Paudel** entitled **"Automated College Timetable Generator"** in partial fulfilment
of the requirements for the degree of Bachelor of Science in Computer Science and Information
Technology be processed for evaluation.

<br><br>

…………………………………

**SIGNATURE**

«Supervisor Name»
Supervisor
Department of Computer Application
Academia International College, Gwarko, Lalitpur

---

<div align="center">

«College logo»

# Tribhuvan University
## Institute of Science and Technology
## Academia International College

# LETTER OF APPROVAL

</div>

This is to certify that this project prepared by **Prajwal Basnet** and **Shekhar Paudel**
entitled **"Automated College Timetable Generator"** in partial fulfilment of the
requirements for the degree of Bachelor of Science in Computer Science and Information
Technology has been evaluated. In our opinion it is satisfactory in scope and quality as a
project for the required degree.

<br>

| | |
|---|---|
| SIGNATURE of Supervisor<br>…………………………<br>«Supervisor Name»<br>Academia International College<br>Gwarko, Lalitpur | SIGNATURE of Coordinator<br>…………………………<br>«Coordinator Name»<br>Co-ordinator<br>Academia International College<br>Gwarko, Lalitpur |
| SIGNATURE of Internal Examiner<br>…………………………<br>Internal Examiner | SIGNATURE of External Examiner<br>…………………………<br>External Examiner |

---

# ACKNOWLEDGEMENT

We extend our heartfelt gratitude to «Supervisor Name», our supervisor at Academia
International College, for the guidance, patience and technical scrutiny that shaped this
project. The insistence that every performance claim be measured rather than asserted is the
single piece of advice that most improved the work, and it is the reason Chapter 5 of this
report reports seeded, reproducible measurements instead of an estimate.

We are grateful to the Department of Computer Application and to the college management for
providing the resources and the platform to carry out this project, and to the faculty of the
department for the coursework in Design and Analysis of Algorithms and Web Technologies on
which this project directly builds.

We would also like to thank the administrative staff who described the existing manual
timetabling process to us in detail. The five shortcomings listed in Section 1.2 are their
account of the problem, not our supposition of it.

Finally, we thank our classmates for their feedback during the increment reviews, and for
using early builds of the system and reporting what confused them.

<br>

Yours sincerely,

**Prajwal Basnet** («symbol number»)
**Shekhar Paudel** («symbol number»)

---

# ABSTRACT

This project presents the design, implementation and evaluation of an **Automated College
Timetable Generator** that constructs conflict-free weekly class schedules for a college using
a **Genetic Algorithm implemented from scratch**, with no optimisation or solver library of any
kind.

Timetable scheduling is a classic NP-hard constraint satisfaction problem: teachers, student
batches, rooms and time slots interact, so an assignment made anywhere in the schedule can
invalidate an assignment made elsewhere. Colleges affiliated with Tribhuvan University
typically construct the schedule by hand over two to three weeks, and the result still
commonly contains double-bookings that surface only after the semester has begun.

The system schedules a fixed college dataset sized to the proposal's benchmark — six
programmes, thirty courses, twenty teachers, fifteen rooms and twelve batches, giving 180
weekly class sessions to place in 36 time slots. Each candidate timetable is encoded as a
chromosome with one gene per session, and scored by the fitness function
*f = 1 / (1 + total penalty)*. Teacher, room and batch clashes carry a penalty of 100 each;
teacher qualification and room capacity are guaranteed by construction; two small soft
penalties discourage teacher idle gaps and uneven daily loads. Tournament selection,
single-point crossover, per-gene mutation and elitism drive the search, followed by a small
targeted repair step.

The system is a browser-only application written in React and TypeScript. Pressing a single
button runs the algorithm, draws its convergence live, and shows the finished timetable by
batch, teacher or room. The project deliberately narrows the proposal's scope to the algorithm:
data management, database, login and export were left out.

Over ten seeded runs the system finds a clash-free timetable in a mean of **7.1 generations
and 384 milliseconds**, against a requirement of 500 generations and 120 seconds. Without the
repair step the plain genetic algorithm also succeeds, but needs a mean of 379 generations, and
two of ten runs exceed the 500-generation target. Repair cuts the generations needed by about
fifty times.

**Keywords:** Genetic Algorithm, Timetable Scheduling, NP-hard, Constraint Satisfaction,
Memetic Algorithm, Educational Resource Allocation, TypeScript.

---

# LIST OF FIGURES

| Figure | Title | Page |
|---|---|---|
| Figure 1.1 | Incremental Model of Development | «p» |
| Figure 3.1 | Use Case Diagram of the User | «p» |
| Figure 3.2 | Gantt Chart of the Project Schedule | «p» |
| Figure 3.3 | Class Diagram of the Algorithm | «p» |
| Figure 3.4 | Sequence Diagram of Timetable Generation | «p» |
| Figure 3.5 | Activity Diagram of the Genetic Algorithm | «p» |
| Figure 4.1 | System Architecture | «p» |
| Figure 4.2 | Component Diagram of the System | «p» |
| Figure 4.3 | Chromosome Encoding of a Candidate Timetable | «p» |
| Figure 5.1 | The Application After a Run | «p» |
| Figure 5.2 | Convergence of Hard Violations and Best Fitness | «p» |

> UML figures are drawn from the Mermaid source in [`UML.md`](UML.md) and exported to PNG for
> the printed report. Figures 5.1 and 5.2 are screenshots of the running application.

---

# LIST OF TABLES

| Table | Title | Page |
|---|---|---|
| Table 3.1 | Functional Requirements | «p» |
| Table 3.2 | Non-Functional Requirements | «p» |
| Table 3.3 | Hard Constraints and Penalty Weights | «p» |
| Table 3.4 | Soft Constraints and Penalty Weights | «p» |
| Table 3.5 | Technology Package Table | «p» |
| Table 3.6 | Economic Feasibility Table | «p» |
| Table 4.1 | Modules of the Genetic Algorithm Engine | «p» |
| Table 4.2 | Genetic Algorithm Parameters | «p» |
| Table 5.1 | Test Environment Table | «p» |
| Table 5.2 | Test for Encoding | «p» |
| Table 5.3 | Test for Fitness Evaluation | «p» |
| Table 5.4 | Test for Genetic Operators | «p» |
| Table 5.5 | Test for the Complete Algorithm | «p» |
| Table 5.6 | Ten Seeded Runs With Repair | «p» |
| Table 5.7 | Ten Seeded Runs Without Repair | «p» |
| Table 5.8 | Summary: Effect of the Repair Step | «p» |
| Table 5.9 | Achievement Against the Proposal's Expected Outcomes | «p» |

---

# LIST OF ABBREVIATIONS

| | |
|---|---|
| **CRUD** | Create, Read, Update, Delete |
| **CSIT** | Computer Science and Information Technology |
| **CSS** | Cascading Style Sheets |
| **DOM** | Document Object Model |
| **FR** | Functional Requirement |
| **GA** | Genetic Algorithm |
| **HTML** | Hypertext Markup Language |
| **NFR** | Non-Functional Requirement |
| **NP** | Nondeterministic Polynomial time |
| **PDF** | Portable Document Format |
| **RBAC** | Role-Based Access Control |
| **SDLC** | Software Development Life Cycle |
| **SPA** | Single Page Application |
| **TS** | TypeScript |
| **TU** | Tribhuvan University |
| **UI** | User Interface |
| **UML** | Unified Modeling Language |

---

# Chapter 1: Introduction

## 1.1 Introduction

The **Automated College Timetable Generator** is a system that constructs a complete,
conflict-free weekly class schedule for a college. The efficient allocation of academic
resources is one of the most operationally demanding tasks a higher education institution
faces. A timetable must simultaneously satisfy constraints involving instructors, student
batches, classrooms and time slots, and these constraints interact: an assignment made to
resolve one clash routinely creates another somewhere else in the schedule. As a college grows
in enrolment and expands its programme offerings, the difficulty of producing a valid schedule
increases far faster than the number of classes, which makes the manual approach both slow and
unreliable.

Timetable scheduling is formally an **NP-hard** combinatorial optimisation problem [1]: no
known algorithm can guarantee an optimal solution for every instance in polynomial time. The
dataset used in this project admits on the order of 10^523 candidate timetables, so exhaustive
enumeration is not merely impractical but physically impossible. A method is required that
searches this space intelligently rather than completely.

This project applies a **Genetic Algorithm** — a search technique modelled on natural
selection, introduced by Holland [2] and developed by Goldberg [3] — implemented from scratch
in TypeScript with no optimisation, solver or genetic-algorithm library. Each candidate
timetable is encoded as a chromosome whose genes each place one class session. A fitness
function scores a chromosome as *f = 1 / (1 + total penalty)*, where the penalty counts three
kinds of clash at 100 each plus two small soft penalties. Successive generations are produced by
tournament selection, single-point crossover, per-gene mutation and elitism, so that a
population of initially random timetables evolves towards one with no clashes. The approach
follows the precedent set by Colorni, Dorigo and Maniezzo, who established genetic algorithms as
an effective method for highly constrained timetabling problems [4].

The system is a single-page application that runs entirely in the browser. The college data is
built into the application; the user presses **Generate timetable**, watches a live chart of
the search, and then reads the finished timetable by batch, teacher or room.

## 1.2 Problem Statement

Most colleges affiliated with Tribhuvan University construct their timetables through a
manual, committee-driven process. A small group of administrators spends several days —
frequently two to three weeks — assembling the schedule on paper or in spreadsheet software.
This process exhibits five critical shortcomings:

| Shortcoming | Consequence |
|---|---|
| **Resource conflicts** | An instructor booked for two classes at once, or two batches placed in one room. Detecting such clashes across hundreds of slots by eye is tedious and unreliable. |
| **Time inefficiency** | Two to three weeks of coordination each semester, and any mid-semester change forces a near-complete rework. |
| **Suboptimal utilisation** | Large rooms assigned to small classes while smaller rooms sit empty; instructors left with long idle gaps between periods. |
| **Lack of scalability** | Each additional batch introduces constraints that interact with every existing one, so difficulty grows disproportionately to size. |
| **No standardised validation** | No systematic mechanism verifies that all constraints are met, so errors surface only after the semester has begun. |

The problem this project addresses is therefore to show that a genetic algorithm can construct
a demonstrably conflict-free timetable automatically, in seconds rather than weeks, for a
college of realistic size.

## 1.3 Objectives

The project attempts to fulfil the following objectives:

1. To design and implement a custom Genetic Algorithm from scratch that produces a weekly
   timetable satisfying all hard constraints.
2. To incorporate soft-constraint optimisation within the fitness function, reducing
   instructor idle gaps and evening out each batch's daily load.
3. To display the timetable, and the algorithm's progress while it runs, from the batch,
   instructor and room perspectives.
4. To evaluate the algorithm's performance — convergence behaviour, time to a conflict-free
   timetable, and the effect of the repair step — over reproducible seeded runs.

The proposal also listed a data management module and a PDF/Excel export module. These were
deliberately left out so that the project could concentrate on the algorithm; Section 1.4.3
lists every deviation from the proposal.

## 1.4 Scope and Limitation

### 1.4.1 Scope

The following fall within the scope of this project:

- Generation of a conflict-free weekly timetable by a Genetic Algorithm written from scratch,
  following the proposal's seven steps, plus one documented repair step.
- A fixed, realistic dataset sized to the proposal's benchmark: 6 programmes, 30 courses,
  20 teachers, 15 rooms, 12 batches, 180 sessions, 36 slots.
- A live chart of hard violations and best fitness per generation while the search runs.
- A plain timetable grid of the result, viewable by batch, teacher or room.
- Eight automated tests of the encoding, the fitness function, the operators and the full run.

### 1.4.2 Limitation

- **Fixed data.** The dataset is hard-coded in `src/data.ts`; changing it means editing that
  file.
- **No completeness guarantee.** The algorithm cannot prove that no valid timetable exists. It
  only reports a plain error if a course has no qualified teacher or a batch fits no room.
- **Simplified model.** No laboratories, room types, departments or teacher availability.
- **Hand-tuned soft weights,** chosen empirically rather than derived.
- **No persistence, login or export.** A timetable exists only in the open browser tab.

### 1.4.3 Deviations from the Proposal

An earlier build of this project was a full-stack system with a server, a relational database,
login, CRUD screens and export. The team removed all of it and kept only what demonstrates the
algorithm, because that is the substance of the project and the rest was obscuring it. The
deviations are stated plainly:

| Proposal item | Status in the delivered system |
|---|---|
| FR1 — CRUD screens for institutional data | Not implemented. Data is fixed in `src/data.ts`. |
| FR5 — PDF and Excel export | Not implemented. |
| FR6 — Authentication and role-based access | Not implemented. The application has a single user. |
| NFR3 — Relational database | Not implemented. Nothing is stored. |
| FR3 — Grid with department filter and lab colouring | Partial. Plain table filtered by batch, teacher or room; there are no departments or labs. |
| NFR4 — Meaningful errors for impossible data | Partial. Only the two checks listed in Section 1.4.2. |
| Step 3 — capacity as a penalised constraint | Changed. Capacity (and qualification) are guaranteed by construction instead of penalised. |
| Hard constraints | Extended. A batch-clash check is added (Section 4.3.3). |
| Steps 1–7 | Extended. A targeted repair step is added (Section 4.3.6). |

## 1.5 Development Methodology

Several software development methodologies are available, and the appropriate choice depends
on project goals, requirement stability, team size and timeline. This project followed the
**Incremental Model**.

### 1.5.1 Incremental Model

In the incremental model, the software requirements are divided into several stand-alone
modules or increments. Each development cycle focuses on delivering one increment in a phased
and sequential manner, with the capability of the system growing as increments accumulate. The
model is iterative, allowing continuous refinement based on testing insight and supervisor
feedback, which is why it suits a project whose core component — the algorithm — could not be
specified precisely in advance of measuring it.

The scheduling engine is not a feature that can be judged complete by inspection; it is
complete only when it is measured to solve the benchmark instance within budget. Building it in
increments, each ending in a measurement, meant that the slow convergence of the plain
algorithm (Section 5.3.3) surfaced early, with time remaining to respond.

The iterations that this system passed through are as follows:

**Increment 1 — Data and Encoding.** The college dataset and the session encoding (Step 1),
with teacher qualification and room capacity built into each session's list of options.

**Increment 2 — Genetic Algorithm.** Population initialisation, fitness evaluation, tournament
selection, single-point crossover, mutation and the evolutionary loop (Steps 2–7), implemented
exactly as specified. Measurement showed the plain algorithm needed several hundred
generations, sometimes more than the 500-generation target.

**Increment 3 — Repair.** The targeted repair step was added and the soft weights were scaled
below one hard violation (Section 4.3.4).

**Increment 4 — Interface and Evaluation.** The single page with the live chart and timetable
grid, the automated tests, and the seeded measurements of Chapter 5. The earlier server,
database, login and export were removed in this increment (Section 1.4.3).

<div align="center">

«Figure 1.1 — Incremental Model of Development»

**Figure 1.1: Incremental Model**

</div>

## 1.6 Report Organization

**Chapter 1** introduces the project background, the problem statement that motivated it, the
objectives, the scope, limitations and deviations from the proposal, and the development
methodology followed.

**Chapter 2** presents the background study and literature review, covering the terminology of
the domain, the theory of genetic algorithms, and a comparative review of existing timetabling
systems and of the academic literature on the problem.

**Chapter 3** presents the system analysis: requirement analysis with the use case diagram, the
constraint specification, feasibility analysis, and the analysis-level UML diagrams.

**Chapter 4** presents the system design: the architecture, the chromosome encoding, and the
full specification of the genetic algorithm.

**Chapter 5** presents implementation and testing: the tools used, the implementation of each
module, the test cases, and the measured results.

**Chapter 6** presents the conclusion and future recommendations.

---

# Chapter 2: Background Study and Literature Review

## 2.1 Background Study

The construction of academic timetables has evolved from wall charts and paper grids, through
spreadsheet trackers, to dedicated optimisation software. What has not changed is the
underlying difficulty: the problem is combinatorial, and the number of candidate schedules
grows exponentially with the number of sessions to be placed. Even and Itai established in
1976 that the general timetabling problem is NP-hard [1], which is the formal statement of
what every timetabling committee discovers in practice — that there is no procedure which
reliably produces a valid schedule by working through the classes one at a time.

Manual approaches remain common in Nepali colleges because the alternative has historically
been expensive commercial software designed around institutional structures that do not match
Tribhuvan University's programme and batch model. The result is a process that consumes weeks
of administrative time each semester and still produces schedules containing clashes.

**Terminologies related to this project:**

- **Session:** One weekly lecture of a course taught to one batch. A course requiring three
  lectures per week generates three sessions.
- **Time Slot:** One (day, period) pair in the weekly grid. The system uses a six-day week
  (Sunday to Friday) of six one-hour periods (06:30 to 12:30), giving 36 slots.
- **Batch:** A cohort of students of a given programme and section who attend classes
  together, with a recorded size.
- **Hard Constraint:** A condition that a usable timetable must satisfy absolutely, such as an
  instructor not being in two places at once. Any violation renders the timetable unusable.
- **Soft Constraint:** A desirable property that improves timetable quality without being
  mandatory, such as minimising an instructor's idle periods.
- **Chromosome:** One complete candidate timetable, encoded as an array of genes.
- **Gene:** The placement of one session — the teacher, room and time slot assigned to it.
- **Fitness:** A single number scoring a chromosome, defined here as *1 / (1 + total penalty)*,
  so that a lower penalty gives higher fitness and a flawless timetable scores 1.0.
- **Generation:** One complete cycle of evaluation, selection, crossover and mutation applied
  to the population.
- **Elitism:** The practice of carrying the best individuals of a generation forward unchanged,
  guaranteeing that the best solution found is never lost.
- **Convergence:** The state in which successive generations cease to yield improvement.

**The Genetic Algorithm.** A genetic algorithm is a population-based search technique that
applies the mechanics of natural selection to a set of candidate solutions [2]. A population of
random candidates is scored by a fitness function; fitter individuals are more likely to be
selected as parents; parents are recombined through crossover and perturbed by mutation to
form the next generation. Over successive generations, the population drifts towards regions
of the search space that score well. The technique makes no assumption that the objective
function is continuous, differentiable or unimodal, which is what makes it applicable to a
discrete, heavily constrained problem such as timetabling where gradient-based methods have no
meaning [3].

## 2.2 Literature Review

**Academic literature.** Colorni, Dorigo and Maniezzo applied genetic algorithms to school
timetabling and reported that the technique handles the highly constrained case effectively,
particularly when combined with problem-specific local search [4]. Their finding, that pure
recombination is slow in tightly constrained instances and that hybridisation helps, is
directly corroborated by the repair comparison in Section 5.3.3 of this report. Abramson
approached the same problem with simulated annealing and demonstrated that metaheuristics in
general are viable where exact methods are not, while also documenting the sensitivity of such
methods to parameter choice [5].

**Existing systems.** Several commercial and open-source timetabling products exist:

*FET (Free Evolutionary Timetabling)* is an open-source scheduling application that uses a
heuristic algorithm and supports a large constraint vocabulary. It is powerful but operates as
a desktop application with a dense configuration interface, requires the data to be re-entered
in its own format, and provides no web access for departmental staff or students.

*aSc TimeTables* is a widely used commercial product with a mature interface and strong
printing support. It is licensed per installation at a cost that is significant for a Nepali
college, and its data model is oriented towards school-level structures rather than the
programme-and-batch structure of a Tribhuvan University affiliate.

*UniTime* is a comprehensive open-source university timetabling system used by large
institutions. It is genuinely capable, but its deployment and configuration burden is
substantial, and it presumes an institutional scale and an administrative division of labour
that a college of the size considered here does not have.

**The gap addressed.** Existing solutions are either too heavyweight to deploy, too costly to
license, or structured around institutional models that do not match the target context. In
addition, and importantly for a project submitted under CACS452, all of them are used as black
boxes: they do not expose the algorithm, its parameters, or its convergence behaviour. This
project writes the scheduling engine from scratch, keeps it small enough to read in one
sitting, shows its convergence live, and measures its performance rather than asserting it.

---

# Chapter 3: System Analysis

## 3.1 System Analysis

System analysis for the Automated College Timetable Generator involved understanding the
existing manual scheduling process, identifying the constraints a valid timetable must meet,
modelling the algorithm's entities and their interactions, and conducting a feasibility study.

### 3.1.1 Requirement Analysis

Requirement analysis is the process of gathering, documenting and analysing the needs the
system must satisfy, defining its features, functions and overall specification. These
requirements form the basis of the design, implementation and testing that follow.

#### 3.1.1.1 Functional Requirements

The delivered system provides the following capabilities to its single actor, the **User**:

- **Generate a timetable.** Pressing *Generate timetable* runs the genetic algorithm on the
  built-in dataset.
- **Watch progress.** While the search runs, the page shows the generation number, hard
  violations, best fitness and elapsed time, and a chart of hard violations and best fitness
  per generation.
- **View the timetable.** The result is shown as a weekly grid, selectable by batch, teacher or
  room.

Table 3.1 records each functional requirement from the proposal and its status.

**Table 3.1: Functional Requirements**

| ID | Requirement | Status |
|---|---|---|
| FR1 | Administrator interface for CRUD on departments, teachers, courses, rooms, batches and time slots | **Not implemented** — data is fixed in `src/data.ts` |
| FR2 | Genetic Algorithm engine enforcing hard constraints: no teacher double-booking, no room double-booking, no capacity violation | **Implemented** — plus a batch-clash check (§4.3.3) |
| FR3 | Interactive grid with filtering by teacher, batch, room and department; colour coding for lecture and laboratory sessions | **Partial** — plain table by batch, teacher or room; no departments or labs |
| FR4 | Real-time feedback during generation showing generation number and fitness score | **Implemented** — stat tiles and live chart |
| FR5 | Export to PDF and Excel | **Not implemented** |
| FR6 | Authentication with role-based access control | **Not implemented** |

**Use Case Diagram**

A use case diagram is a behavioural diagram defined by the UML whose purpose is to present a
graphical overview of the functionality a system provides, in terms of its actors, their goals
expressed as use cases, and the relationships between them. The system has one actor, the
User, with three use cases: *Generate timetable*, *Watch progress* (included in generation)
and *View timetable by batch, teacher or room*.

<div align="center">

«Figure 3.1 — Use Case Diagram of the User»

**Figure 3.1: Use Case Diagram of the User**

</div>

#### 3.1.1.2 Non-Functional Requirements

Non-functional requirements are not concerned with specific functions delivered to the user but
with emergent properties of the system such as performance, reliability, usability and
security. They constrain how the system achieves its functional requirements.

**Table 3.2: Non-Functional Requirements**

| ID | Requirement | Status |
|---|---|---|
| NFR1 | Conflict-free timetable for 6 programmes / 30 courses / 20 teachers / 15 rooms within 120 seconds | **Met** — 384 ms mean, 442 ms worst (§5.3.1) |
| NFR2 | Responsive interface from 768 px (tablet) to desktop | **Met** — fluid single-column layout; the timetable scrolls horizontally inside its container on narrow screens |
| NFR3 | Persistence in a relational database | **Not implemented** |
| NFR4 | Meaningful error messages when input data makes a feasible schedule impossible | **Partial** — a plain error if a course has no qualified teacher or a batch fits no room |

#### 3.1.1.3 Constraint Specification

The constraints are the substance of the problem, and are therefore specified as part of the
requirements rather than left to the implementation. A hard constraint violation renders a
timetable unusable; a soft constraint violation merely makes it worse.

**Table 3.3: Hard Constraints and Penalty Weights**

| Constraint | How it is enforced |
|---|---|
| Teacher assigned to two sessions in one time slot | Penalty 100 each |
| Room assigned to two sessions in one time slot | Penalty 100 each |
| Batch assigned to two sessions in one time slot | Penalty 100 each |
| Room capacity less than batch size | By construction — a session can only be given a room large enough |
| Teacher not qualified for the course | By construction — a session can only be given a qualified teacher |

**Table 3.4: Soft Constraints and Penalty Weights**

| Constraint | Penalty weight |
|---|---|
| Teacher idle gap (free period between taught periods on one day) | 0.3 each |
| Uneven distribution of a batch's classes across the week | 0.2 × deviation from the daily mean |

The small soft weights are not arbitrary; Section 4.3.4 explains them.

### 3.1.2 Feasibility Analysis

A feasibility analysis assesses whether a proposed project is practical and viable —
technically achievable, operationally acceptable, economically justified and completable within
the available time.

#### 3.1.2.1 Technical Feasibility

The project is technically feasible with current, freely available technology and with the
hardware already in the team's possession. The system is an open-source browser application
written entirely in TypeScript, built with Vite and React. It needs no server or database, so
it runs on any machine with Node.js for development and any modern browser for use.

The algorithmic component required no external library at all, which removes the principal
technical risk associated with an optimisation project — dependence on a third-party solver
whose behaviour cannot be inspected or modified.

**Table 3.5: Technology Package Table**

| Package | Version | Compatibility | Purpose |
|---|---|---|---|
| React | 18.3 | ES2020 browsers | User interface |
| TypeScript | 5.7 | — | Language for the whole system |
| Vite | 6.0 | Node.js ≥ 20 | Development server and build |
| Recharts | 2.15 | React ≥ 17 | Live convergence chart (FR4) |
| Vitest | 2.1 | Node.js ≥ 20 | Automated tests |
| **Genetic Algorithm engine** | — | — | **Written from scratch; zero dependencies** |

#### 3.1.2.2 Operational Feasibility

The system is operationally feasible. It runs in any modern browser — Google Chrome, Brave,
Firefox and Edge — and requires no installation beyond opening the page. There is one button
and two drop-down lists, so there is nothing to learn.

#### 3.1.2.3 Economic Feasibility

The system was developed at effectively zero direct cost. All development tools, frameworks
and libraries are open source and free of licence fees, and development was carried out on the
team's own computers.

**Table 3.6: Economic Feasibility Table**

| Cost category | Item | Cost |
|---|---|---|
| Development | Hardware — team's own computers | Nil |
| Development | Operating system, editor, runtime | Nil (open source) |
| Development | Libraries and frameworks | Nil (MIT licensed) |
| Development | Optimisation solver licence | Nil (algorithm written from scratch) |
| Deployment | Static file hosting, or none (run locally) | Nil |
| Operational | Maintenance | Minimal |

#### 3.1.2.4 Schedule Feasibility

Schedule feasibility considers whether the project can be completed within the time available.
The work was decomposed into the four increments listed in Section 1.5.1, each with a defined
deliverable and an end-of-increment review. Measuring the plain algorithm at the end of
Increment 2 is what left time to add and evaluate the repair step in Increment 3.

<div align="center">

«Figure 3.2 — Gantt Chart»

**Figure 3.2: Gantt Chart of the Project Schedule**

</div>

### 3.1.3 Analysis

#### 3.1.3.1 Class Diagram

A class diagram is a UML diagram that represents the classes of a system, their attributes and
methods, and the relationships between them, describing the static structure of the system.
The class diagram for this system covers the data types — Course, Teacher, Room, Batch and
CollegeData — and the algorithm types: Problem, Session, Gene, Chromosome, Individual,
Evaluation, Rng and the `runGA` function with its Progress and Result.

<div align="center">

«Figure 3.3 — Class Diagram of the Algorithm»

**Figure 3.3: Class Diagram of the Algorithm**

</div>

#### 3.1.3.2 Sequence Diagram

A sequence diagram is an interaction diagram that describes how a group of objects collaborate
and in what order. When the user presses *Generate timetable*, the App component calls
`runGA`. After each generation `runGA` calls back with a Progress record, which the App appends
to its history so the chart and stat tiles re-render; the loop then yields to the browser for
one tick so the page can redraw. When the loop terminates `runGA` returns a Result, and the App
hands the best chromosome to the Timetable component.

<div align="center">

«Figure 3.4 — Sequence Diagram of Timetable Generation»

**Figure 3.4: Sequence Diagram of Timetable Generation**

</div>

#### 3.1.3.3 Activity Diagram

An activity diagram shows the flow of control from one activity to the next within a process.
The activity diagram for this system documents the seven steps of the genetic algorithm —
encoding, population initialisation, fitness evaluation, selection, crossover, mutation and the
termination test — with the repair step marked explicitly as an addition.

<div align="center">

«Figure 3.5 — Activity Diagram of the Genetic Algorithm»

**Figure 3.5: Activity Diagram of the Genetic Algorithm**

</div>

---

# Chapter 4: System Design

## 4.1 Architectural Design

### 4.1.1 System Architecture

The system is a single-page application that runs entirely in the browser. There is no server,
no database and no network traffic after the page has loaded. It has three parts:

- **Data** — `src/data.ts`, the fixed college dataset: courses, teachers with the courses they
  can teach, rooms with capacities, and batches with sizes and courses.
- **Algorithm** — `src/ga/`, the genetic algorithm, one file per step of the proposal. It is
  pure TypeScript with no dependency on React or the browser, which is what lets the same code
  run in the tests under Node.js.
- **Interface** — `src/App.tsx` (the button, stat tiles and chart) and `src/Timetable.tsx`
  (the timetable grid).

The algorithm runs on the browser's main thread. To keep the page responsive, the loop yields
to the browser for one tick after each generation, so the chart redraws while the search runs.

<div align="center">

«Figure 4.1 — System Architecture»

**Figure 4.1: System Architecture**

</div>

### 4.1.2 Component Diagram

A component diagram depicts the components of a system, their interfaces, dependencies and
relationships. Here the App component depends on the dataset, on `buildProblem` and on `runGA`,
and renders the Recharts chart and the Timetable component. `runGA` depends on the population,
fitness, selection, crossover, mutation, repair and rng modules; nothing in `src/ga/` depends on
the interface.

<div align="center">

«Figure 4.2 — Component Diagram of the System»

**Figure 4.2: Component Diagram of the System**

</div>

## 4.2 Data Design

There is no database. The dataset in `src/data.ts` is sized to the proposal's NFR1
configuration:

| Item | Count | Notes |
|---|---:|---|
| Programmes | 6 | BCA, B.Sc. CSIT, BIM, BBA, BBM, BHM |
| Courses | 30 | Five per programme, each 3 lectures a week |
| Teachers | 20 | Each qualified for three courses; qualifications overlap |
| Rooms | 15 | Capacities 35 to 70 |
| Batches | 12 | Two sections per programme, 28 to 55 students |
| Sessions | 180 | 12 batches × 5 courses × 3 lectures |
| Time slots | 36 | Sunday–Friday × six periods, 06:30–12:30 |

## 4.3 Algorithm Details

### 4.3.1 Chromosome Encoding (Step 1)

Each candidate timetable is an array of genes, with one gene per class session. If a course
requires three lectures per week, three separate genes are created.

The list of sessions is computed once from the dataset and never changes during a run. Because
it is fixed and ordered, gene *i* of every chromosome always answers the same question:
*"where does session i go?"* Consequently only the three free variables are stored per gene —
**teacher, room and time slot** — while the course and batch are read from session *i*.

Each session also stores the list of teachers qualified for its course and the list of rooms
large enough for its batch. Every operator draws values only from these lists, so an
unqualified teacher or an undersized room can never appear. The algorithm therefore only has
to remove clashes.

<div align="center">

«Figure 4.3 — Chromosome Encoding»

**Figure 4.3: Chromosome Encoding of a Candidate Timetable**

</div>

### 4.3.2 The Genetic Algorithm

The engine resides in `src/ga/`, with one module per step of the proposal.

**Table 4.1: Modules of the Genetic Algorithm Engine**

| Module | Responsibility |
|---|---|
| `problem.ts` | Step 1 — encoding: sessions, genes, chromosomes |
| `population.ts` | Step 2 — random population initialisation |
| `fitness.ts` | Step 3 — fitness evaluation |
| `selection.ts` | Step 4 — tournament selection |
| `crossover.ts` | Step 5 — single-point crossover |
| `mutation.ts` | Step 6 — mutation |
| `engine.ts` | Step 7 — the evolutionary loop and termination |
| `repair.ts` | Targeted repair (our addition) |
| `rng.ts` | Seeded random number generator (mulberry32) |

No external optimisation, solver or genetic-algorithm library is used anywhere in the engine.
`rng.ts` exists rather than a call to `Math.random()` for reproducibility: with the default
seed of 42, every run of the demo produces the same timetable, and the measurements in Chapter 5
can be repeated exactly.

**Algorithm — the seven steps:**

```
GENETIC-ALGORITHM(data)
 1  sessions   ← BUILD-PROBLEM(data)                    // Step 1
 2  population ← 100 random chromosomes                  // Step 2
 3  for generation ← 1 to 1000
 4      for each individual in population                // Step 3
 5          penalty ← 100 × clashes + softPenalty
 6          fitness ← 1 / (1 + penalty)
 7      if best.fitness = 1, or best has no clashes and
 8         best fitness has not improved for 20 generations
 9          return best                                  // Step 7: terminate
10      next ← top 20% of population by fitness          // elitism
11      while |next| < 100
12          if rand < 0.8
13              c ← CROSSOVER(TOURNAMENT(k=5), TOURNAMENT(k=5))   // Steps 4, 5
14          else
15              c ← COPY(TOURNAMENT(k=5))                // Step 4
16          MUTATE(c, rate = 0.05)                       // Step 6
17          REPAIR(c)                                    // our addition
18          next ← next ∪ {c}
19      population ← next
20  return best
```

**Fitness function.** *f = 1 / (1 + total penalty)*, where the total penalty is 100 per clash
plus the soft penalties of Table 3.4. A flawless timetable scores exactly 1.0. Clashes are found
in a single pass: each (teacher, slot), (room, slot) and (batch, slot) cell remembers the first
gene that took it, and a later gene landing on a taken cell counts as a clash. Both genes are
recorded, so the repair step knows exactly which genes to move.

**Selection** is by tournament with k = 5: five individuals are picked at random and the
fittest becomes a parent. Tournament selection depends only on the *ordering* of fitness
values, never on their spacing. This matters because 1/(1 + penalty) compresses scores into a
very narrow band — one clash scores about 0.0099 and two about 0.0050 — where
fitness-proportionate (roulette-wheel) selection would be nearly blind.

**Crossover** is single-point at rate 0.8: genes before a random cut come from one parent, the
rest from the other. Because gene *i* always describes session *i*, the child is always a
complete, valid timetable. The top 20% of each generation are carried forward unchanged.

**Mutation** applies per gene at rate 0.05 and gives the gene a new room, a new slot, or both —
exactly the proposal's three cases. New values come from the session's own lists, so mutation
cannot break qualification or capacity.

**Table 4.2: Genetic Algorithm Parameters**

| Parameter | Value | Source |
|---|---|---|
| Population size | 100 | Proposal |
| Maximum generations | 1000 | Proposal |
| Crossover rate | 0.8 | Proposal |
| Mutation rate (per gene) | 0.05 | Proposal |
| Tournament size (k) | 5 | Proposal |
| Elitism | Top 20% | Proposal |
| Hard constraint weight | 100 | Proposal |
| Patience (generations without improvement, once clash-free) | 20 | Our addition (§4.3.5) |
| Random seed | 42 | Our addition, for reproducibility |

**Time complexity.** One fitness evaluation touches each of the G genes once, plus a fixed scan
of the teacher and batch grids for the soft penalties, so it is O(G). One generation evaluates
N chromosomes, and repair evaluates each child at most 12 × 8 = 96 more times, so a generation
costs O(N · G) with a bounded constant. At N = 100 and G = 180, a generation takes a few tens of
milliseconds in the browser.

### 4.3.3 Constraint Addition — Batch Clash

The proposal names teacher conflicts, room conflicts and capacity. Without a batch-clash check,
the algorithm readily produces timetables in which one batch of students is scheduled into two
rooms at the same time. Such a timetable satisfies every stated constraint and is still
useless, so the batch clash is added as a third hard constraint with the same penalty of 100.

### 4.3.4 Soft Weights Below One Clash

The soft weights (0.3 per idle gap, 0.2 per unit of uneven daily load) are kept small so that
all soft penalty together stays below the cost of a single clash. A converged timetable carries
a soft penalty of about 8 to 10, far below 100. This makes the search lexicographic: removing
one clash is always worth more than any amount of soft improvement, so the algorithm fixes
clashes first and polishes afterwards. With larger soft weights, a move that removed a real
clash could be rejected because it added a few idle gaps.

### 4.3.5 Termination (Step 7)

The proposal says the loop runs until a chromosome reaches a fitness of 1.0. Taken literally,
that almost never happens: the penalty includes the soft constraints, and a realistic timetable
always keeps a few — a teacher with one idle hour is an ordinary timetable, not a faulty one.
Final fitness is typically around 0.09 to 0.11.

The proposal's expected outcomes equate "a fitness score of 1.0" with "zero hard constraint
violations", so zero clashes is taken as the real goal. The loop stops when any of the
following holds:

1. best fitness equals 1.0 (kept for completeness);
2. the best timetable is clash-free and best fitness has not improved for 20 generations;
3. 1000 generations have run.

The metric reported in Chapter 5 is therefore the **generation, and time, at which the first
clash-free timetable appears**, since that is when the user has a usable result.

### 4.3.6 Targeted Repair — Our Addition

On its own, the plain algorithm reaches a clash-free timetable, but slowly (Section 5.3.3). Once
the population is similar, crossover makes near-copies, and random mutation rarely hits the few
genes that are actually clashing.

The fitness function already knows which genes clash. After mutation, repair takes up to 12 of
those genes and, for each, tries 8 random new placements (teacher, room and slot, all from the
session's lists), keeping a change only if the total penalty falls. It can never make a
timetable worse, and it does nothing to a timetable that is already clash-free. A genetic
algorithm combined with local search in this way is known as a **memetic algorithm**.

---

# Chapter 5: Implementation and Testing

## 5.1 Implementation

### 5.1.1 Tools Used

**React.** React provides the component model for the single page. The App component holds the
run's history in state; each Progress record appended to it re-renders the stat tiles and the
chart.

**TypeScript.** The whole system — data, algorithm and interface — is written in TypeScript, so
the data types, the gene type and the Progress and Result records are checked at compile time.

**Vite.** Vite serves the application during development and bundles it for production
(`npm run dev`, `npm run build`).

**Recharts** draws the live line chart of hard violations and best fitness, and **Vitest** runs
the automated tests (`npm test`).

**The genetic algorithm itself uses none of these.** It is written from scratch in plain
TypeScript with no dependency of any kind.

### 5.1.2 Implementation of Modules

**Data Module (`src/data.ts`).** Declares the days, periods, courses, teachers, rooms and
batches. Qualifications overlap on purpose, so most courses have two or three qualified
teachers and the algorithm has a real choice.

**Encoding Module (`src/ga/problem.ts`).** `buildProblem` expands every batch's courses into
sessions, three per course, and attaches to each session the indices of its qualified teachers
and of the rooms that can seat its batch. If either list is empty it throws a plain error such
as *"No teacher can teach CSC313."*

**Algorithm Module (`src/ga/`).** One file per step, as listed in Table 4.1. `runGA` takes the
problem, a progress callback and a seed, and returns the best chromosome with its fitness, hard
violations, soft penalty, total generations, the generation at which it first became
clash-free, and the elapsed time.

**Interface Module (`src/App.tsx`, `src/Timetable.tsx`).** The page shows a one-line summary of
the dataset and a *Generate timetable* button. While a run is in progress it shows four stat
tiles — generation, hard violations, best fitness and time — above a chart with hard violations
on the left axis and best fitness on the right. When the run ends it shows a result line
(*"Clash-free timetable found at generation 7. Stopped after 61 generations with fitness
0.0877."*) and the timetable: a plain HTML table of six days by six periods, with a selector for
the view (by batch, by teacher, by room) and a drop-down for the batch, teacher or room to
show. Each cell lists the course code and the two other resources.

<div align="center">

«Figure 5.1 — Screenshot of the application after a run: stat tiles, chart and timetable grid»

**Figure 5.1: The Application After a Run**

</div>

## 5.2 Testing

Eight automated tests in `src/ga/ga.test.ts` cover the encoding, the fitness function, the
genetic operators and a complete run. They run with `npm test`. Two small datasets are used: the
real college dataset, and a tiny two-session problem where clashes can be built by hand.

### 5.2.1 Test Environment

**Table 5.1: Test Environment Table**

| | |
|---|---|
| Operating System | macOS (darwin arm64) |
| Runtime | Node.js 20 |
| Browser | Google Chrome, Brave, Firefox |
| Test Runner | Vitest 2 |
| Execution | Single-threaded |

### 5.2.2 Test Cases for Unit Testing

**Test the encoding**
*Test objective:* To verify that the dataset is expanded correctly into sessions and that
qualification and capacity are built in.
*Requirements verified:* FR2.

**Table 5.2: Test for Encoding**

| Test | Action | Expected Result | Result |
|---|---|---|---|
| 1 | Build the problem from the college dataset | 12 × 5 × 3 = 180 sessions | Pass |
| 2 | Inspect every session's teacher and room lists | Every teacher is qualified for the course; every room seats the batch | Pass |

**Test the fitness function**
*Test objective:* To verify that clashes are counted correctly and that fitness follows the
formula.
*Requirements verified:* FR2.

**Table 5.3: Test for Fitness Evaluation**

| Test | Action | Expected Result | Result |
|---|---|---|---|
| 3 | Evaluate two sessions with different teachers and rooms in one slot | 0 hard violations; fitness = 1/(1 + penalty) | Pass |
| 4 | Evaluate two sessions with the same teacher in one slot | 1 hard violation; penalty ≥ 100; both genes flagged as clashing | Pass |
| 5 | Evaluate two sessions in the same room in one slot | 1 hard violation | Pass |

**Test the genetic operators**
*Test objective:* To verify that crossover and mutation always produce valid timetables.
*Requirements verified:* FR2.

**Table 5.4: Test for Genetic Operators**

| Test | Action | Expected Result | Result |
|---|---|---|---|
| 6 | Cross two random chromosomes | Child has one gene per session, each copied from one of the parents | Pass |
| 7 | Mutate a chromosome at rate 1.0 | Every room is from the session's list; every slot is in 0–35 | Pass |

### 5.2.3 Test Cases for System Testing

**Test the complete algorithm**
*Test objective:* To verify the proposal's Expected Outcome 2 on the college dataset.
*Requirements verified:* FR2, NFR1.

**Table 5.5: Test for the Complete Algorithm**

| Test | Action | Expected Result | Result |
|---|---|---|---|
| 8 | Run the full algorithm with the default seed | 0 hard violations; first clash-free within 500 generations; under 120 seconds | Pass |

The interface was tested by hand: pressing the button shows the chart and tiles updating live,
the button is disabled during a run, and switching the view and entity drop-downs shows the
matching timetable.

## 5.3 Result Analysis

All figures below come from running `runGA` on the college dataset with the default parameters
of Table 4.2 and seeds 1 to 10 (and 42, the demo default). Every run is seeded, so the figures
are reproducible on equivalent hardware. Times are wall-clock on the test environment of
Table 5.1.

### 5.3.1 NFR1 Compliance

**Table 5.6: Ten Seeded Runs With Repair**

| Seed | Hard violations, generation 1 | Clash-free at generation | Total generations | Final fitness | Final soft penalty |
|---:|---:|---:|---:|---:|---:|
| 1 | 62 | 7 | 141 | 0.1111 | 8.0 |
| 2 | 58 | 7 | 79 | 0.1010 | 8.9 |
| 3 | 61 | 7 | 96 | 0.0943 | 9.6 |
| 4 | 64 | 7 | 160 | 0.1087 | 8.2 |
| 5 | 62 | 8 | 101 | 0.1020 | 8.8 |
| 6 | 61 | 7 | 90 | 0.1111 | 8.0 |
| 7 | 65 | 8 | 105 | 0.0980 | 9.2 |
| 8 | 65 | 7 | 128 | 0.1064 | 8.4 |
| 9 | 64 | 7 | 103 | 0.1042 | 8.6 |
| 10 | 64 | 6 | 74 | 0.1020 | 8.8 |

| Metric | Mean | Worst | Budget | Verdict |
|---|---:|---:|---:|:--|
| Generations to clash-free | 7.1 | 8 | 500 | **PASS** |
| Time to clash-free | 384 ms | 442 ms | 120,000 ms | **PASS** |
| Hard violations at the end | 0 | 0 | 0 | **PASS** (10/10 runs) |

Every run stopped by the patience rule: clash-free, then 20 generations without improvement.
A full run, including soft-constraint polishing, took 74 to 160 generations and 3.3 to 6.8 s;
the user has a usable timetable long before that.

### 5.3.2 Convergence Behaviour

With the default seed of 42, the best timetable of the first generation has 50 hard violations.
Repair and selection remove them within a handful of generations: the first clash-free
timetable appears at **generation 7, after 368 ms**. From then on only soft penalties remain,
each worth a fraction of a penalty unit, so best fitness climbs slowly as idle gaps and uneven
days are reduced. The run stops at generation 61, about 2.7 s, after 20 generations without
improvement, with a final fitness of 0.0877.

The shape is typical of a genetic algorithm on a constrained problem. The hard-violation line
falls steeply to zero, and at that moment best fitness jumps, because removing the last clash
takes the penalty from over 100 to about 10. After that the fitness line flattens.

<div align="center">

«Figure 5.2 — Screenshot of the live chart for seed 42: hard violations and best fitness against generation»

**Figure 5.2: Convergence of Hard Violations and Best Fitness**

</div>

### 5.3.3 Effect of the Repair Step

To measure what repair contributes, the same ten seeds were run with repair switched off — that
is, the proposal's Steps 1 to 7 exactly.

**Table 5.7: Ten Seeded Runs Without Repair**

| Seed | Hard violations, generation 1 | Clash-free at generation | Total generations | Final fitness | Final soft penalty |
|---:|---:|---:|---:|---:|---:|
| 1 | 62 | 286 | 336 | 0.0336 | 28.8 |
| 2 | 58 | 445 | 465 | 0.0353 | 27.3 |
| 3 | 61 | 514 | 534 | 0.0303 | 32.0 |
| 4 | 64 | 308 | 328 | 0.0330 | 29.3 |
| 5 | 62 | 377 | 397 | 0.0292 | 33.2 |
| 6 | 61 | 289 | 309 | 0.0279 | 34.8 |
| 7 | 65 | 572 | 592 | 0.0336 | 28.8 |
| 8 | 65 | 316 | 336 | 0.0327 | 29.6 |
| 9 | 64 | 317 | 337 | 0.0322 | 30.1 |
| 10 | 64 | 364 | 384 | 0.0271 | 35.9 |

**Table 5.8: Summary: Effect of the Repair Step**

| Metric | With repair | Without repair |
|---|---:|---:|
| Runs reaching a clash-free timetable | 10 / 10 | 10 / 10 |
| Generations to clash-free (mean) | 7.1 | 378.8 |
| Generations to clash-free (worst) | 8 | 572 |
| Runs over the 500-generation target | 0 | 2 |
| Final soft penalty | 8.0 – 9.6 | 27.3 – 35.9 |
| Time to first clash-free timetable (mean / worst) | 384 ms / 442 ms | — |

The plain algorithm does work: every run reaches a clash-free timetable. But it needs a mean of
379 generations, and in two of ten runs it needs more than 500, which breaks the proposal's
Expected Outcome 2. Its timetables are also worse, with roughly three times the soft penalty,
because it spends most of its generations removing clashes and has little left for polishing.

Repair cuts the generations needed by about fifty times and is what makes Expected Outcome 2
hold on every run. The reason is that mutation is blind: at rate 0.05, about nine of the 180
genes change per child, chosen without regard to which genes are clashing. Repair uses the
fitness function's list of clashing genes and changes only those.

### 5.3.4 Achievement Against the Expected Outcomes

**Table 5.9: Achievement Against the Proposal's Expected Outcomes**

| Expected outcome | Result |
|---|---|
| 1. Working application producing conflict-free timetables | **Achieved** for the built-in dataset: 0 clashes in every run; qualification and capacity guaranteed by construction. |
| 2. Custom GA in TypeScript reaching zero hard violations within 500 generations, well under 120 seconds | **Achieved** with repair: 7.1 generations and 384 ms mean over 10 seeds. Without repair, 2 of 10 runs exceed 500 generations. |
| 3. Interactive multi-perspective timetable view with lecture/laboratory differentiation | **Partial.** Batch, teacher and room views; no laboratories to differentiate. |
| 4. Print-ready PDF and spreadsheet export | **Not achieved** — removed from scope (§1.4.3). |
| 5. Documented performance analysis | **Achieved.** Section 5.3: convergence chart, ten-seed runs, and the repair comparison. |
| 6. Report with UML diagrams, design, implementation and testing | **Achieved.** This document and [`UML.md`](UML.md). |

---

# Chapter 6: Conclusion and Future Recommendation

## 6.1 Conclusion

This project delivers a genetic algorithm, written from scratch in TypeScript with no
optimisation library, that builds a clash-free weekly timetable for a college of the size the
proposal specified in well under a second: a mean of 7.1 generations and 384 ms over ten seeded
runs, against targets of 500 generations and 120 seconds.

The algorithm follows the proposal's seven steps. The places where it departs from them — the
batch-clash constraint, qualification and capacity enforced by construction, the termination
rule, and the targeted repair step — are each documented in the code and in this report. The
team also deliberately narrowed the proposal's scope to the algorithm, leaving out data
management, the database, login and export; Section 1.4.3 lists these honestly.

The main finding is the one in Section 5.3.3: the textbook genetic algorithm, implemented
faithfully, does solve this problem, but slowly and not always within the proposal's
500-generation target. A small, directed repair step, which only moves the genes that are
actually clashing, makes it about fifty times faster and makes the target hold on every run.

## 6.2 Limitations

1. **Fixed dataset.** The data is hard-coded; there is no way to enter a college's own data
   without editing `src/data.ts`.
2. **No persistence, login or export.** The timetable disappears when the tab is closed.
3. **Simplified model.** No laboratories, room types, departments or teacher availability.
4. **No completeness guarantee.** The algorithm cannot prove that no timetable exists.
5. **Hand-tuned soft weights,** chosen empirically rather than derived.
6. **Main-thread execution.** The search runs on the browser's main thread, yielding between
   generations; a much larger dataset would make the page feel slower.

## 6.3 Future Recommendations

**Data entry and export.** Restore the proposal's FR1 and FR5: screens to enter a college's own
data, and PDF/Excel export of the result.

**Richer constraints.** Laboratory sessions of two consecutive periods, room types and teacher
availability, each either built into the session's option lists or added as a penalty.

**Minimal-perturbation rescheduling.** When one teacher becomes unavailable mid-semester, an
administrator needs the smallest set of changes that restores a valid timetable, not a
completely new one. This fits the current design by adding a penalty for distance from the
existing timetable and seeding the population with it.

**Web Worker execution,** so the search runs off the main thread and larger datasets do not
affect the page.

---

# REFERENCES

[1] S. Even and Y. Itai, "On the complexity of timetable and multicommodity flow problems,"
*SIAM Journal on Computing*, vol. 5, no. 4, pp. 691–703, 1976.

[2] J. H. Holland, *Adaptation in Natural and Artificial Systems*. Ann Arbor, MI: University of
Michigan Press, 1975.

[3] D. E. Goldberg, *Genetic Algorithms in Search, Optimization, and Machine Learning*.
Reading, MA: Addison-Wesley, 1989.

[4] A. Colorni, M. Dorigo and V. Maniezzo, "Genetic algorithms and highly constrained problems:
The timetable case," in *Proc. 1st Int. Workshop on Parallel Problem Solving from Nature*,
Dortmund, Germany, pp. 55–59, 1990.

[5] D. Abramson, "Constructing school timetables using simulated annealing: Sequential and
parallel algorithms," *Management Science*, vol. 37, no. 1, pp. 98–113, 1991.

---

# APPENDIX

## Appendix A — Screenshots

| | |
|---|---|
| «Screenshot 1» | The page before a run — dataset summary and *Generate timetable* button |
| «Screenshot 2» | A run in progress — stat tiles and live chart |
| «Screenshot 3» | After a run — result line and timetable, batch view |
| «Screenshot 4» | Timetable, teacher view |

## Appendix B — Selected Source Code

**Fitness evaluation (`src/ga/fitness.ts`)**

```typescript
// Each (teacher, slot), (room, slot) and (batch, slot) cell remembers the gene that
// took it first. A gene landing on a taken cell is a clash; both genes are recorded.
chromosome.forEach((gene, i) => {
  const batch = problem.sessions[i].batch;
  claim(teacherCell, gene.teacher * SLOTS + gene.slot, i);
  claim(roomCell, gene.room * SLOTS + gene.slot, i);
  claim(batchCell, batch * SLOTS + gene.slot, i);
});

const softPenalty =
  IDLE_GAP_PENALTY * countIdleGaps(teacherCell, teachers.length) +
  UNEVEN_DAY_PENALTY * countUnevenDays(batchCell, batches.length);

const penalty = HARD_PENALTY * hardViolations + softPenalty;
return { fitness: 1 / (1 + penalty), penalty, hardViolations, softPenalty, conflicted: [...inClash] };
```

**Tournament selection (`src/ga/selection.ts`)**

```typescript
export function tournament(population: Individual[], k: number, rng: Rng): Individual {
  let best = rng.pick(population);
  for (let i = 1; i < k; i++) {
    const challenger = rng.pick(population);
    if (challenger.fitness > best.fitness) best = challenger;
  }
  return best;
}
```

**Single-point crossover (`src/ga/crossover.ts`)**

```typescript
// Gene i always describes session i, so the child is always a complete, valid timetable.
export function crossover(a: Chromosome, b: Chromosome, rng: Rng): Chromosome {
  const cut = 1 + rng.int(a.length - 1);
  return a.map((gene, i) => ({ ...(i < cut ? gene : b[i]) }));
}
```

**Mutation (`src/ga/mutation.ts`)**

```typescript
// A mutated gene gets a new room, a new slot, or both.
chromosome.forEach((gene, i) => {
  if (!rng.chance(rate)) return;
  const session = problem.sessions[i];
  const choice = rng.int(3);
  if (choice !== 1) gene.room = rng.pick(session.rooms);
  if (choice !== 0) gene.slot = rng.int(SLOTS);
});
```

**Targeted repair (`src/ga/repair.ts`)**

```typescript
// For up to 12 clashing genes, try 8 random placements each; keep a change only if
// the total penalty falls. It can never make a timetable worse.
for (const i of genes) {
  if (current.hardViolations === 0) break;
  const gene = chromosome[i];
  const session = problem.sessions[i];
  let best = { ...gene };
  for (let t = 0; t < TRIES_PER_GENE; t++) {
    gene.teacher = rng.pick(session.teachers);
    gene.room = rng.pick(session.rooms);
    gene.slot = rng.int(SLOTS);
    const trial = evaluate(problem, chromosome);
    if (trial.penalty < current.penalty) {
      current = trial;
      best = { ...gene };
    }
  }
  Object.assign(gene, best);
}
```

## Appendix C — Running the System

```bash
npm install
npm run dev      # open the page, press "Generate timetable"
npm test         # 8 tests
npm run build    # production bundle in dist/
```

All runs are seeded (default seed 42), so the demo produces the same timetable every time.
