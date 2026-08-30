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
report contains a reproducible benchmark suite instead of an estimate.

We are grateful to the Department of Computer Application and to the college management for
providing the resources and the platform to carry out this project, and to the faculty of the
department for the coursework in Design and Analysis of Algorithms, Database Management
Systems and Web Technologies on which this project directly builds.

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
Timetable Generator**, a web application that constructs conflict-free weekly class schedules
for a college using a **Genetic Algorithm implemented from scratch**, with no optimisation or
solver library of any kind.

Timetable scheduling is a classic NP-hard constraint satisfaction problem: teachers, student
batches, rooms and time slots interact, so an assignment made anywhere in the schedule can
invalidate an assignment made elsewhere. Colleges affiliated with Tribhuvan University
typically construct the schedule by hand over two to three weeks, and the result still
commonly contains double-bookings that surface only after the semester has begun.

The system accepts the institutional data a college already maintains — departments,
programmes, courses and their weekly loads, instructors with their subject expertise and
declared availability, rooms with capacities and types, and student batches with enrolment
counts — and evolves a population of candidate timetables. Each candidate is encoded as a
chromosome of genes, one gene per required class session, and is scored by the fitness
function *f = 1 / (1 + total penalty)*. Seven hard constraints carry a penalty of 100 each and
four soft constraints carry fractional weights, so the search eliminates every conflict before
it begins optimising preferences such as instructor idle gaps and room utilisation balance.
Tournament selection, single-point crossover, per-gene mutation and elitism drive the search,
hybridised with a targeted local-search repair operator.

The system is built on a three-tier architecture using React with TypeScript, Node.js with
Express, and PostgreSQL accessed through Prisma. The generated timetable is presented in an
interactive grid filterable by batch, teacher and room, with live progress streamed during
generation and export to PDF and Excel.

On the benchmark configuration specified in the project proposal — six programmes, thirty
courses, twenty instructors, fifteen rooms, comprising 204 class sessions — the system
produces a timetable with **zero hard-constraint violations in a mean of 753 milliseconds and
13.2 generations** over ten independently seeded runs, against a requirement of 120 seconds
and 500 generations. An ablation study establishes the project's principal finding: the
genetic algorithm exactly as specified, without the repair operator, solves **none** of five
benchmark runs, plateauing at an average of 6.4 residual violations. Hybridisation with
directed local search is what makes the difference between a system that works and one that
does not.

**Keywords:** Genetic Algorithm, Timetable Scheduling, NP-hard, Constraint Satisfaction,
Memetic Algorithm, Educational Resource Allocation, TypeScript.

---

# LIST OF FIGURES

| Figure | Title | Page |
|---|---|---|
| Figure 1.1 | Incremental Model of Development | «p» |
| Figure 3.1 | Use Case Diagram of Administrator | «p» |
| Figure 3.2 | Use Case Diagram of Viewer | «p» |
| Figure 3.3 | Gantt Chart of the Project Schedule | «p» |
| Figure 3.4 | State Diagram of a Schedule Run | «p» |
| Figure 3.5 | Class Diagram of the System | «p» |
| Figure 3.6 | Object Diagram at Generation 13 | «p» |
| Figure 3.7 | Sequence Diagram of Timetable Generation | «p» |
| Figure 3.8 | Activity Diagram of the Genetic Algorithm | «p» |
| Figure 4.1 | Three-Tier Architecture | «p» |
| Figure 4.2 | Layered Application Architecture | «p» |
| Figure 4.3 | Component Diagram of the System | «p» |
| Figure 4.4 | Deployment Diagram of the System | «p» |
| Figure 4.5 | Entity Relationship Diagram | «p» |
| Figure 4.6 | Chromosome Encoding of a Candidate Timetable | «p» |
| Figure 5.1 | Convergence of Best Fitness Against Generation | «p» |
| Figure 5.2 | Time to Conflict-Free Timetable Against Input Size | «p» |

> All UML figures are maintained as Mermaid source in [`UML.md`](UML.md) and are exported to
> PNG for the printed report. Figures 5.1 and 5.2 are plotted from
> `benchmarks/results/*.csv`, regenerated by `npm run bench`.

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
| Table 5.2 | Test for Authentication of User | «p» |
| Table 5.3 | Test for Role-Based Access Control | «p» |
| Table 5.4 | Test for Creating Institutional Records | «p» |
| Table 5.5 | Test for Updating and Deleting Records | «p» |
| Table 5.6 | Test for Constraint Detection | «p» |
| Table 5.7 | Test for Genetic Operators | «p» |
| Table 5.8 | Test for Feasibility Analysis | «p» |
| Table 5.9 | Test for Timetable Generation | «p» |
| Table 5.10 | Test for Filtering and Viewing the Timetable | «p» |
| Table 5.11 | Test for Export to PDF and Excel | «p» |
| Table 5.12 | Test for Data Integrity | «p» |
| Table 5.13 | Test for Error Handling | «p» |
| Table 5.14 | NFR1 Compliance over Ten Seeded Runs | «p» |
| Table 5.15 | Summary of NFR1 Compliance | «p» |
| Table 5.16 | Convergence Behaviour of a Representative Run | «p» |
| Table 5.17 | Parameter Sweep Results | «p» |
| Table 5.18 | Scalability Results | «p» |
| Table 5.19 | Ablation of the Documented Refinements | «p» |
| Table 5.20 | Achievement Against the Proposal's Expected Outcomes | «p» |

---

# LIST OF ABBREVIATIONS

| | |
|---|---|
| **API** | Application Programming Interface |
| **CRUD** | Create, Read, Update, Delete |
| **CSIT** | Computer Science and Information Technology |
| **CSS** | Cascading Style Sheets |
| **CSV** | Comma-Separated Values |
| **DBMS** | Database Management System |
| **DOM** | Document Object Model |
| **ERD** | Entity Relationship Diagram |
| **FR** | Functional Requirement |
| **GA** | Genetic Algorithm |
| **HTTP** | Hypertext Transfer Protocol |
| **JSON** | JavaScript Object Notation |
| **JWT** | JSON Web Token |
| **NFR** | Non-Functional Requirement |
| **NP** | Nondeterministic Polynomial time |
| **ORM** | Object Relational Mapping |
| **PDF** | Portable Document Format |
| **RBAC** | Role-Based Access Control |
| **REST** | Representational State Transfer |
| **SDLC** | Software Development Life Cycle |
| **SPA** | Single Page Application |
| **SQL** | Structured Query Language |
| **SSE** | Server-Sent Events |
| **TS** | TypeScript |
| **TU** | Tribhuvan University |
| **UI** | User Interface |
| **UML** | Unified Modeling Language |
| **XLSX** | Office Open XML Spreadsheet |

---

# Chapter 1: Introduction

## 1.1 Introduction

The **Automated College Timetable Generator** is a web-based system that constructs a complete,
conflict-free weekly class schedule for a college from the institutional data the college
already keeps. The efficient allocation of academic resources is one of the most operationally
demanding tasks a higher education institution faces. A timetable must simultaneously satisfy
constraints involving instructors, student batches, classrooms and time slots, and these
constraints interact: an assignment made to resolve one clash routinely creates another
somewhere else in the schedule. As a college grows in enrolment and expands its programme
offerings, the difficulty of producing a valid schedule increases far faster than the number
of classes, which makes the manual approach both slow and unreliable.

Timetable scheduling is formally an **NP-hard** combinatorial optimisation problem [1]: no
known algorithm can guarantee an optimal solution for every instance in polynomial time. The
benchmark configuration used in this project admits on the order of 10^639 candidate
timetables, so exhaustive enumeration is not merely impractical but physically impossible.
A method is required that searches this space intelligently rather than completely.

This project applies a **Genetic Algorithm** — a search technique modelled on natural
selection, introduced by Holland [2] and developed by Goldberg [3] — implemented from scratch
in TypeScript with no optimisation, solver or genetic-algorithm library. Each candidate
timetable is encoded as a chromosome whose genes each place one required class session. A
fitness function scores a chromosome as *f = 1 / (1 + total penalty)*, where the penalty
aggregates seven hard-constraint violations weighted at 100 each and four soft-constraint
violations weighted fractionally. Successive generations are produced by tournament selection,
single-point crossover, per-gene mutation and elitism, so that a population of initially random
timetables evolves towards one that violates nothing. The approach follows the precedent set
by Colorni, Dorigo and Maniezzo, who established genetic algorithms as an effective method for
highly constrained timetabling problems [4].

The system is built on a three-tier architecture. React with TypeScript provides the
administrative interface and an interactive timetable grid; Node.js with Express hosts the REST
API and the evolutionary engine; PostgreSQL, accessed through the Prisma ORM, persists both the
institutional data and every generated schedule together with the parameters that produced it.
Generation progress is streamed to the browser live, and the finished timetable can be filtered
by batch, instructor or room and exported to PDF and Excel.

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

The problem this project addresses is therefore to produce a system that constructs a
demonstrably conflict-free timetable automatically, in seconds rather than weeks, that
optimises resource utilisation rather than merely avoiding clashes, and that reports clearly
when the supplied data makes a valid timetable impossible.

## 1.3 Objectives

The project attempts to fulfil the following objectives:

1. To develop a data management module for registering and managing departments, programmes,
   courses, instructors, rooms, batches and time slots through a web interface.
2. To design and implement a custom Genetic Algorithm from scratch that produces an optimised
   weekly timetable satisfying all hard constraints.
3. To incorporate soft-constraint optimisation within the fitness function, minimising
   instructor idle gaps and balancing room utilisation.
4. To build an interactive frontend that displays the timetable in a filterable data grid with
   batch, instructor and room perspectives.
5. To implement an export module producing print-ready PDF and Excel output.
6. To evaluate the algorithm's performance — convergence behaviour, fitness progression and
   completion time across varying input sizes — through a reproducible benchmark suite.

All six objectives have been met. Section 5.4 reports the measurements for objective 6.

## 1.4 Scope and Limitation

### 1.4.1 Scope

The following fall within the scope of this project:

- Management of all institutional entities required for scheduling, through authenticated CRUD
  screens with server-side validation.
- Generation of a conflict-free weekly timetable by a Genetic Algorithm written from scratch,
  enforcing seven hard constraints and optimising four soft constraints.
- Pre-flight feasibility analysis that detects impossible input datasets before the search
  begins and reports the specific record at fault.
- Interactive display of the result with filtering by batch, instructor, room and department,
  and visual differentiation of lecture and laboratory sessions.
- Live streaming of generation progress, showing generation number, best fitness and remaining
  violations while the search runs.
- Export to PDF and Excel, with one page or worksheet per batch, instructor or room.
- Authentication with role-based access control distinguishing administrators from viewers.
- A reproducible, seeded benchmark suite measuring compliance, convergence, parameter
  sensitivity, scalability and the contribution of each documented refinement.

### 1.4.2 Limitation

The project does not address the following:

- **No completeness guarantee.** The algorithm cannot prove that no valid timetable exists for
  a dataset; the feasibility checker detects only necessary conditions, not sufficient ones.
- **A scalability ceiling.** The system does not converge on a stress instance of 600 sessions
  across 30 batches within its generation budget. This is roughly three times the benchmark
  scale and is reported as measured in Section 5.4.4.
- **Hand-tuned soft weights.** Soft-constraint weights were determined empirically rather than
  derived, and are not configurable per institution without a code change.
- **Fixed two-period laboratories.** The encoding supports arbitrary session durations, but the
  user interface does not expose the setting.
- **No mid-semester rescheduling.** Regeneration produces a fresh timetable rather than
  minimally perturbing the existing one.
- **Single-tenant deployment.** One deployment serves one institution.
- **No integration with external calendars** or student information systems.

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

The incremental model was selected for one decisive reason specific to this project. The
scheduling engine is not a feature that can be judged complete by inspection; it is complete
only when it is measured to solve the benchmark instance within budget. Building it in
increments, each ending in a measurement, meant that the discovery documented in Section
5.4.5 — that the algorithm as originally specified does not solve the benchmark instance —
surfaced during Increment 3 with time remaining to respond, rather than at the end of a
waterfall cycle.

The iterations that this system passed through are as follows:

**Increment 1 — Foundation and Authentication Module.** The database schema, the shared
validation package, and authentication with JSON Web Tokens and role-based access control were
built. The system validates supplied credentials against stored records and grants access on a
match, generating specific error messages otherwise.

**Increment 2 — Data Management Module.** CRUD screens for departments, programmes, courses,
instructors with their expertise and availability, rooms, batches and meeting times, each
validated against the same schema on the client and the server.

**Increment 3 — Genetic Algorithm Engine.** Session expansion, population initialisation,
fitness evaluation, tournament selection, single-point crossover, mutation and the evolutionary
loop, implemented exactly as specified. Benchmarking at the end of this increment revealed the
plateau at approximately six residual violations that motivated Increment 4.

**Increment 4 — Algorithm Refinement.** The targeted repair operator and random immigrant
injection were added, the soft-constraint weights were rescaled following the diagnosis in
Section 4.3.4, and pre-flight feasibility analysis was implemented. The benchmark instance was
solved in 13.4 generations.

**Increment 5 — Presentation, Export and Evaluation.** The interactive grid, live progress
streaming over server-sent events, PDF and Excel export, and the four-part benchmark suite
whose results constitute Section 5.4.

<div align="center">

«Figure 1.1 — Incremental Model of Development»

**Figure 1.1: Incremental Model**

</div>

## 1.6 Report Organization

**Chapter 1** introduces the project background, the problem statement that motivated it, the
objectives, the scope and limitations, and the development methodology followed.

**Chapter 2** presents the background study and literature review, covering the terminology of
the domain, the theory of genetic algorithms, and a comparative review of existing timetabling
systems and of the academic literature on the problem.

**Chapter 3** presents the system analysis: functional and non-functional requirement analysis
with use case diagrams, the constraint specification, feasibility analysis on technical,
operational, economic and schedule dimensions, and the analysis-level UML diagrams.

**Chapter 4** presents the system design in detail: architectural and application design,
component and deployment structure, the data model, the chromosome encoding, and the full
specification of the genetic algorithm together with the authentication mechanism.

**Chapter 5** presents implementation and testing: the tools used, the implementation of each
module, the test cases and their outcomes, and the result analysis with all measurements.

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

- **Session:** One occurrence of a course taught to one batch, of a defined type (lecture or
  laboratory) and duration in periods. A course requiring three lectures per week generates
  three sessions.
- **Meeting Time (Slot):** One (day, period) pair in the weekly grid. The system uses a
  six-day week of six periods, giving 36 slots.
- **Batch:** A cohort of students of a given programme and semester who attend classes
  together, with a recorded enrolment count.
- **Hard Constraint:** A condition that a usable timetable must satisfy absolutely, such as an
  instructor not being in two places at once. Any violation renders the timetable unusable.
- **Soft Constraint:** A desirable property that improves timetable quality without being
  mandatory, such as minimising an instructor's idle periods.
- **Chromosome:** One complete candidate timetable, encoded as an array of genes.
- **Gene:** The placement of one session — the instructor, room and starting slot assigned to
  it.
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
recombination is insufficient and that hybridisation is necessary in tightly constrained
instances, is directly corroborated by the ablation study in Section 5.4.5 of this report.
Abramson approached the same problem with simulated annealing and demonstrated that
metaheuristics in general are viable where exact methods are not, while also documenting the
sensitivity of such methods to parameter choice [5] — a sensitivity this project quantifies
for the genetic algorithm case in the parameter sweep of Section 5.4.3.

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
project addresses a college-scale institution with a web-based system whose scheduling engine
is written from scratch, whose parameters are exposed to the administrator, and whose
performance is measured and reported rather than asserted.

---

# Chapter 3: System Analysis

## 3.1 System Analysis

System analysis for the Automated College Timetable Generator involved understanding the
existing manual scheduling process, gathering requirements from administrative staff,
modelling the entities and their interactions, and conducting a feasibility study across
technical, operational, economic and schedule dimensions.

### 3.1.1 Requirement Analysis

Requirement analysis is the process of gathering, documenting and analysing the needs the
system must satisfy, defining its features, functions and overall specification. These
requirements form the basis of the design, implementation and testing that follow.

#### 3.1.1.1 Functional Requirements

Functional requirements define the specific capabilities the system must possess:

**Data Management**
*Actors:* Administrator
- The system shall allow administrators to create, read, update and delete departments,
  programmes, courses, instructors, rooms, batches and time slots.
- Instructors shall carry both a subject expertise list and a declared weekly availability
  matrix.
- Every input shall be validated against a shared schema on both the client and the server, so
  that the two validations cannot diverge.

**Timetable Generation**
*Actors:* Administrator
- The system shall generate a weekly timetable using a Genetic Algorithm that enforces all
  hard constraints.
- The administrator shall be able to configure population size, mutation rate, crossover rate,
  tournament size, elitism proportion and generation ceiling before a run.
- The system shall analyse the input data for feasibility before beginning the search, and
  report the specific records at fault when no valid timetable can exist.

**Progress Monitoring**
*Actors:* Administrator
- The system shall stream the generation number, best fitness and remaining violation counts
  to the browser while the search is running.

**Timetable Viewing**
*Actors:* Administrator, Viewer
- The system shall display the generated timetable in an interactive grid.
- Users shall be able to filter by batch, instructor, room and department.
- Lecture and laboratory sessions shall be visually distinguished.

**Export**
*Actors:* Administrator, Viewer
- The system shall export the timetable to PDF and Excel, producing one page or worksheet per
  batch, instructor or room.

**Security**
*Actors:* Administrator, Viewer
- The system shall authenticate users and enforce role-based access control on the server, so
  that a viewer cannot modify data or run the algorithm regardless of what the client permits.

**Table 3.1: Functional Requirements**

| ID | Requirement | Status |
|---|---|---|
| FR1 | Administrator interface for CRUD on departments, teachers (with expertise and availability), courses, rooms, batches and time slots | Implemented — seven screens |
| FR2 | Genetic Algorithm engine enforcing hard constraints: no teacher double-booking, no room double-booking, no capacity violation | Implemented — plus four further hard constraints (§4.3.3) |
| FR3 | Interactive grid with filtering by teacher, batch, room and department; colour coding for lecture and laboratory sessions | Implemented — AG-Grid, three views |
| FR4 | Real-time feedback during generation showing generation number and fitness score | Implemented — server-sent events, live chart |
| FR5 | Export to PDF and Excel with separate pages/sheets per batch, teacher and room | Implemented — six export combinations |
| FR6 | Authentication with role-based access control distinguishing administrators from viewers | Implemented — JWT, enforced server-side |

**Use Case Diagram**

A use case diagram is a behavioural diagram defined by the UML whose purpose is to present a
graphical overview of the functionality a system provides, in terms of its actors, their goals
expressed as use cases, and the relationships between them.

<div align="center">

«Figure 3.1 — Use Case Diagram of Administrator (UML.md §1)»

**Figure 3.1: Use Case Diagram of Administrator**

«Figure 3.2 — Use Case Diagram of Viewer (UML.md §1)»

**Figure 3.2: Use Case Diagram of Viewer**

</div>

#### 3.1.1.2 Non-Functional Requirements

Non-functional requirements are not concerned with specific functions delivered to the user but
with emergent properties of the system such as performance, reliability, usability and
security. They constrain how the system achieves its functional requirements.

**Table 3.2: Non-Functional Requirements**

| ID | Requirement | Status |
|---|---|---|
| NFR1 | Conflict-free timetable for 6 programmes / 30 courses / 20 teachers / 15 rooms within 120 seconds | **Met** — 753 ms mean, 800 ms worst (§5.4.1) |
| NFR2 | Responsive interface from 768 px (tablet) to desktop | Met — CSS grid layout with a breakpoint at 1024 px |
| NFR3 | Persistence in a relational database with foreign key constraints and validation | Met — PostgreSQL 16, every relation a real foreign key |
| NFR4 | Meaningful error messages when input data makes a feasible schedule impossible | Met — pre-flight feasibility analysis (§4.3.5) |

#### 3.1.1.3 Constraint Specification

The constraints are the substance of the problem, and are therefore specified as part of the
requirements rather than left to the implementation. A hard constraint violation renders a
timetable unusable; a soft constraint violation merely makes it worse.

**Table 3.3: Hard Constraints and Penalty Weights**

| Constraint | Penalty weight |
|---|---|
| Teacher assigned to two sessions in one time slot | 100 |
| Room assigned to two sessions in one time slot | 100 |
| Batch assigned to two sessions in one time slot | 100 |
| Room capacity less than batch student count | 100 |
| Laboratory session assigned to a lecture hall | 100 |
| Instructor scheduled outside declared availability | 100 |
| Instructor assigned a course they are not qualified for | 100 |

**Table 3.4: Soft Constraints and Penalty Weights**

| Constraint | Penalty weight |
|---|---|
| Instructor idle gap (free period between taught periods on one day) | 0.3 |
| Uneven distribution of a batch's classes across the week | 0.2 |
| Same subject in consecutive periods for one batch | 0.2 |
| Room utilisation imbalance | 0.1 |

The fractional soft weights are not arbitrary. They are the outcome of an experimental finding
recorded in Section 4.3.4.

### 3.1.2 Feasibility Analysis

A feasibility analysis assesses whether a proposed project is practical and viable —
technically achievable, operationally acceptable, economically justified and completable within
the available time.

#### 3.1.2.1 Technical Feasibility

The project is technically feasible with current, freely available technology and with the
hardware already in the team's possession. The system is an open-source web application written
entirely in TypeScript. React with Vite provides the single-page frontend; Node.js with Express
provides the backend runtime and REST API; PostgreSQL, accessed through the Prisma ORM,
provides persistence. Choosing one language for the entire stack allowed the entity types and
the Zod validation schemas to be placed in a shared workspace package imported by both sides,
so that client-side and server-side validation are literally the same objects and cannot drift
apart.

The algorithmic component required no external library at all, which removes the principal
technical risk associated with an optimisation project — dependence on a third-party solver
whose behaviour cannot be inspected or modified.

**Table 3.5: Technology Package Table**

| Package | Version | Compatibility | Purpose |
|---|---|---|---|
| React + Vite + TypeScript | React 18 | Node.js ≥ 18, ES2020 | Single-page frontend |
| AG-Grid Community | 31.x | React ≥ 17 | Interactive timetable grid (FR3) |
| Recharts | 2.x | React ≥ 17 | Live convergence chart (FR4) |
| Express | 4.18.x | Node.js ≥ 18 | REST API and SSE endpoint |
| Prisma ORM | 5.x | Node.js ≥ 18, PostgreSQL ≥ 12 | Data access and migrations |
| PostgreSQL | 16 | — | Relational persistence (NFR3) |
| Zod | 3.x | TypeScript ≥ 4.5 | Shared client/server validation |
| jsonwebtoken + bcrypt | 9.x / 5.x | Node.js ≥ 18 | Authentication (FR6) |
| exceljs + pdfmake | 4.x / 0.2.x | Node.js ≥ 18 | Export module (FR5) |
| Vitest | 1.x | Node.js ≥ 18 | Unit, property and integration testing |
| **Genetic Algorithm engine** | — | — | **Written from scratch; zero dependencies** |

#### 3.1.2.2 Operational Feasibility

The system is operationally feasible. It runs in any modern browser — Google Chrome, Brave,
Firefox and Edge were tested — and requires no client installation. The administrative screens
follow the same layout and validation conventions throughout, so a member of staff who can
operate one entity screen can operate all of them.

Crucially, the system replaces a process the target users already perform and already find
burdensome, and it consumes data they already maintain. Adoption therefore does not require
them to record anything new; it requires them to enter, once, information that currently lives
in a spreadsheet. The output is delivered in the formats they already distribute — printed PDF
per batch and per instructor, and Excel for further editing — which means the system fits into
the existing administrative workflow rather than requiring that workflow to change.

#### 3.1.2.3 Economic Feasibility

The system was developed at effectively zero direct cost. All development tools, frameworks,
libraries and the database are open source and free of licence fees, and development was
carried out on the team's own computers.

**Table 3.6: Economic Feasibility Table**

| Cost category | Item | Cost |
|---|---|---|
| Development | Hardware — team's own computers | Nil |
| Development | Operating system, editor, runtime, database | Nil (open source) |
| Development | Libraries and frameworks | Nil (MIT/Apache licensed) |
| Development | Optimisation solver licence | Nil (algorithm written from scratch) |
| Deployment | Server hosting (single VPS or on-premise machine) | Low / existing infrastructure |
| Deployment | Data entry and initial setup | One-time staff effort |
| Operational | Maintenance and upgrades | Minimal |

Against these costs stands the saving of two to three weeks of administrative effort each
semester, and the avoidance of the disruption caused by clashes discovered after teaching has
begun. The project is economically justified by a wide margin.

#### 3.1.2.4 Schedule Feasibility

Schedule feasibility considers whether the project can be completed within the time available.
The work was decomposed into the five increments listed in Section 1.5.1, each with a defined
deliverable and an end-of-increment review. Structuring the schedule around increments rather
than phases meant that the algorithm was measured at the end of Increment 3 rather than at the
end of the project, which is what left time to implement and evaluate the refinement in
Increment 4.

<div align="center">

«Figure 3.3 — Gantt Chart»

**Figure 3.3: Gantt Chart of the Project Schedule**

</div>

### 3.1.3 Analysis

#### 3.1.3.1 State Diagram

A state diagram is a visual representation of the states of an object or system and the
transitions between them, giving an abstract description of behaviour in terms of states,
transitions and the events that trigger them. In this system the object with a meaningful
lifecycle is the schedule run: it is created in a draft state, validated for feasibility,
executed, and terminates as completed, exhausted, infeasible or failed. Because these states
are persisted, the outcome of a run — including the reason an infeasible dataset was
rejected — survives a page reload or a server restart.

<div align="center">

«Figure 3.4 — State Diagram (UML.md §7)»

**Figure 3.4: State Diagram of a Schedule Run**

</div>

#### 3.1.3.2 Class and Object Diagram

**Class Diagram:** A class diagram is a UML diagram that represents the classes of a system,
their attributes and methods, and the relationships between them, describing the static
structure of the system. It is a central tool of object-oriented modelling and design. The
class diagram for this system covers both the persistent entities — Department, Programme,
Course, Instructor, Room, Batch, MeetingTime — and the algorithm classes: ProblemContext,
SessionRequirement, Gene, Chromosome, Individual, FitnessEvaluator and GeneticAlgorithm.

<div align="center">

«Figure 3.5 — Class Diagram (UML.md §2)»

**Figure 3.5: Class Diagram of the System**

</div>

**Object Diagram:** An object diagram is a UML diagram providing a view of objects and their
relationships within a system at a particular point in time. It illustrates real instances of
classes rather than the classes themselves. The object diagram given here captures a single
instant of a benchmark run — generation 13, at the moment the first conflict-free chromosome
appears — which makes the chromosome encoding concrete: gene 47 stores only the three free
variables, while the course, batch and session type are read from requirement 47 of the fixed
requirement list.

<div align="center">

«Figure 3.6 — Object Diagram (UML.md §8)»

**Figure 3.6: Object Diagram at Generation 13**

</div>

#### 3.1.3.3 Sequence Diagram

A sequence diagram is an interaction diagram that describes how a group of objects collaborate
and in what order. The sequence diagram for timetable generation shows why the generation
endpoint returns `202 Accepted` immediately rather than blocking until the search completes:
the browser must be able to open the progress stream and observe the run it has just started.
It also shows the feasibility check diverting an impossible dataset to a `422` response with
specific reasons, before any evolutionary work is done.

<div align="center">

«Figure 3.7 — Sequence Diagram (UML.md §4)»

**Figure 3.7: Sequence Diagram of Timetable Generation**

</div>

#### 3.1.3.4 Activity Diagram

An activity diagram shows the flow of control from one activity to the next within a process,
and is capable of representing complex systems clearly. The activity diagram for this system
documents the seven steps of the genetic algorithm — session expansion, population
initialisation, fitness evaluation, selection, crossover, mutation and the termination test —
with the two documented refinements, random immigrant injection and targeted repair, marked
explicitly as additions.

<div align="center">

«Figure 3.8 — Activity Diagram (UML.md §5)»

**Figure 3.8: Activity Diagram of the Genetic Algorithm**

</div>

---

# Chapter 4: System Design

## 4.1 Architectural Design

### 4.1.1 System Architecture

The system follows a **three-tier architecture**, which separates the user interface, the
functional process logic and the data storage into distinct layers:

- The **Presentation tier** is the user-visible part of the application, accepting input and
  presenting results. It is realised as a React 18 single-page application written in
  TypeScript, using AG-Grid Community for the timetable grid and Recharts for the convergence
  visualisation.
- The **Application tier**, also known as the middle tier, handles the computation and the
  operations that mediate between input requirements and stored data. It is a Node.js 20
  process running Express, which hosts the REST API, the authentication and authorisation
  middleware, the export module and the genetic algorithm engine.
- The **Data tier**, at the lowest layer, manages all data-related operations — storage,
  retrieval, aggregation, integrity enforcement and constraint checking. It is PostgreSQL 16,
  accessed through the Prisma ORM, with every relationship expressed as a real foreign key.

A fourth element sits outside the tiers rather than within them: `packages/shared`, a workspace
package containing the entity type definitions, the Zod validation schemas and the algorithm's
constants. Both the frontend and the backend import it. This is the concrete realisation of the
design decision to use one language across the stack: the client forms and the Express
middleware validate against literally the same schema objects, so the two validations cannot
drift apart as the system evolves.

<div align="center">

«Figure 4.1 — Three-Tier Architecture»

**Figure 4.1: Three-Tier Architecture**

</div>

### 4.1.2 Application Architecture

Within the application tier the code follows a **layered architecture** with a strict
dependency direction: routes depend on services, services depend on repositories and on the
algorithm engine, and nothing depends on anything above it.

- **Routes** parse and validate the HTTP request, apply authentication and role checks, and
  translate the result into a response. They contain no domain logic.
- **Services** hold the domain logic: assembling the problem context from stored data, running
  feasibility analysis, invoking the engine, decoding and persisting the result.
- **Repositories** (Prisma clients) perform data access and are the only code that issues
  queries.
- **The engine** is entirely pure. It receives a problem context and parameters, and returns a
  result. It performs no input or output, opens no connection and knows nothing about HTTP or
  the database.

The purity of the engine is a deliberate design decision rather than a stylistic preference. It
is what allows the same code to be driven three ways without duplication — synchronously by
the command-line benchmark harness, asynchronously by the HTTP endpoint that streams progress,
and directly by the unit tests — and it is what makes the algorithm testable in isolation from
the web application entirely.

<div align="center">

«Figure 4.2 — Layered Application Architecture»

**Figure 4.2: Layered Application Architecture**

</div>

### 4.1.3 Component Diagram

A component diagram depicts the components of a system, their interfaces, dependencies and
relationships. It is part of the UML and is used during design to provide a concise view of the
structure of a software system, which aids understanding, communication and maintenance. It is
particularly useful for visualising high-level architecture.

<div align="center">

«Figure 4.3 — Component Diagram (UML.md §6)»

**Figure 4.3: Component Diagram of the System**

</div>

### 4.1.4 Deployment Diagram

A deployment diagram is a UML diagram illustrating the physical deployment of software
artifacts onto hardware nodes. Deployment diagrams are closely related to component diagrams:
component diagrams describe the components of the system, while deployment diagrams show how
those components are deployed onto hardware. This system deploys as a static frontend bundle
served over HTTP, a Node.js application process, and a PostgreSQL instance, which may run on
the same machine for a single-college deployment.

<div align="center">

«Figure 4.4 — Deployment Diagram (UML.md §6)»

**Figure 4.4: Deployment Diagram of the System**

</div>

## 4.2 Database Design

### 4.2.1 Data Model

The data model comprises seven core entities — **Department, Programme, Course, Instructor,
Room, Batch** and **MeetingTime** — together with **InstructorAvailability** as an explicit
join table, and **ScheduleRun** and **ScheduleAssignment** to persist results.

`ScheduleRun` stores the parameter configuration alongside the outcome. This is a deliberate
design decision with a specific consequence: it converts the comparative parameter analysis
required by the project's expected outcomes from a manually maintained spreadsheet into a
database query, and because the random seed is stored with the run, any past run can be
reproduced exactly.

<div align="center">

«Figure 4.5 — Entity Relationship Diagram (UML.md §3)»

**Figure 4.5: Entity Relationship Diagram**

</div>

## 4.3 Algorithm Details

### 4.3.1 Chromosome Encoding

Each candidate timetable is an array of genes, with one gene per required class session. A gene
encodes the tuple **(Course, Teacher, Room, Time Slot, Batch)**. If a course requires three
lectures per week, three separate genes are created.

The implementation adds one refinement to this scheme. The **requirement list** — what must be
placed — is computed once from the institutional data and never changes during a run. Because
it is fixed and ordered, gene *i* of every chromosome always answers the same question: *"where
does requirement i go?"* Consequently only the three free variables need to be stored per gene
— instructor, room and starting slot — while the course, batch and session type are read from
the requirement at that index.

This has an important consequence for crossover, discussed in Section 4.3.2: splicing two
parents at any point still yields exactly one placement for every requirement, so the offspring
is always well-formed and no repair of the encoding is ever needed.

A laboratory session is represented as a **single gene with a duration of two periods**, not as
two independent genes. Contiguity therefore holds by construction: no operator can separate a
laboratory's two hours, and no repair pass is required to restore it.

<div align="center">

«Figure 4.6 — Chromosome Encoding»

**Figure 4.6: Chromosome Encoding of a Candidate Timetable**

</div>

### 4.3.2 The Genetic Algorithm

The engine resides in `server/src/ga/`, with one module per stage of the algorithm.

**Table 4.1: Modules of the Genetic Algorithm Engine**

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

No external optimisation, solver or genetic-algorithm library is used anywhere in the engine.
The sole reason `rng.ts` exists rather than a call to `Math.random()` is reproducibility: a
performance comparison an examiner cannot reproduce demonstrates nothing.

**Algorithm — the seven steps:**

```
GENETIC-ALGORITHM(context, params)
 1  requirements ← EXPAND-SESSIONS(context)              // Step 1
 2  population   ← RANDOM-POPULATION(requirements, N)    // Step 2
 3  for generation ← 1 to maxGenerations
 4      for each individual in population                // Step 3
 5          penalty ← 100 × hardViolations + Σ softWeightᵢ × softViolationsᵢ
 6          fitness ← 1 / (1 + penalty)
 7      if best.hardViolations = 0 and soft score has converged
 8          return best                                  // Step 7: terminate
 9      next ← top 20% of population by fitness          // elitism
10      while |next| < N
11          p1 ← TOURNAMENT-SELECT(population, k = 5)    // Step 4
12          p2 ← TOURNAMENT-SELECT(population, k = 5)
13          c  ← (rand < 0.8) ? CROSSOVER(p1, p2) : COPY(p1)   // Step 5
14          c  ← MUTATE(c, rate = 0.05)                  // Step 6
15          c  ← REPAIR(c)                               // refinement
16          next ← next ∪ {c}
17      if no improvement for 50 generations
18          next ← INJECT-IMMIGRANTS(next)               // refinement
19      population ← next
20  return best
```

**Fitness function.** *f = 1 / (1 + total penalty)*, where the total penalty is the sum of hard
violations weighted at 100 each and soft violations weighted per Table 3.4. A flawless
timetable scores exactly 1.0.

**Selection** is by tournament with k = 5. Roulette-wheel selection was considered and rejected
for a specific reason. Because fitness is 1/(1 + penalty), scores compress into a very narrow
band once the population is even moderately good: a chromosome with two violations scores
0.00498 and one with three scores 0.00332. Fitness-proportionate selection would be nearly
blind at that resolution. Tournament selection depends only on the *ordering* of fitness
values, never on their spacing, so it retains full selection pressure however compressed the
scores become.

**Crossover** is single-point at rate 0.8, with the top 20% of each generation carried forward
unchanged as elites. The offspring is always well-formed and requires no repair operator — a
direct consequence of the encoding of Section 4.3.1.

**Mutation** applies per gene at rate 0.05, reassigning the room, the time slot, or both. The
implementation adds instructor reassignment as a fourth case: several courses have three
qualified teachers, and without the ability to move a session to a different one, the algorithm
can resolve a teacher clash only by moving the session in time — a much narrower escape route.
Every replacement is drawn from the requirement's pre-computed eligible sets, so mutation can
never produce an unqualified teacher, an undersized room, or a laboratory in a lecture hall.

**Table 4.2: Genetic Algorithm Parameters**

| Parameter | Value | Source |
|---|---|---|
| Population size | 100 | Proposal default |
| Tournament size (k) | 5 | Proposal default |
| Crossover rate | 0.8 | Proposal default |
| Mutation rate (per gene) | 0.05 | Proposal default (0.01 measured better — §5.4.3) |
| Elitism | Top 20% | Proposal default |
| Generation ceiling | 1000 | Proposal default |
| Fitness | 1 / (1 + penalty) | Proposal specification |
| Hard constraint weight | 100 | Proposal specification |
| Stagnation threshold for immigrants | 50 generations | Implementation refinement |

**Time complexity.** Each generation evaluates N chromosomes of G genes each, and evaluation is
linear in the number of scheduled periods P because occupancy is bucketed rather than compared
pairwise (Section 4.3.6). One generation therefore costs O(N · P), and a run of g generations
costs O(g · N · P). At benchmark scale — N = 100, P = 228, g ≈ 13 to conflict-free — this is
approximately 3 × 10^5 gene evaluations, which is why the search completes in well under a
second.

### 4.3.3 Constraint Additions

Two hard constraints beyond those named in the project proposal proved necessary during
implementation. They are documented here rather than folded in silently.

**Batch double-booking.** The proposal names teacher conflict, room conflict and capacity.
Without a batch conflict check, the algorithm readily produces timetables in which one batch of
students is scheduled into two rooms simultaneously. Such timetables satisfy every stated
constraint and are nonetheless useless.

**Instructor availability and qualification.** These are captured in the data model per FR1 but
are not listed among the hard constraints in the proposal. Enforcing them is the only thing
that makes the availability matrix meaningful; without enforcement it is data the system stores
and ignores.

### 4.3.4 Fitness Weighting — an Experimental Finding

The initial implementation assigned soft-constraint weights of 3, 2, 2 and 1. The algorithm
**stalled at six hard-constraint violations** by generation 450 and did not improve over the
remaining 550 generations.

The cause was structural rather than a coding defect. A realistic timetable carries roughly 190
unavoidable soft violations — a teacher with one idle hour is an ordinary timetable, not a
defective one. At those weights the soft term contributed approximately 40% of the total
penalty, so a move that eliminated a genuine double-booking could be rejected because it
introduced a handful of idle gaps. The hard-constraint signal was being drowned by soft noise.

Rescaling the soft weights so that their total remains comfortably below the cost of a
**single** hard violation restored the intended lexicographic behaviour: eliminate every
conflict first, then polish. With weights of 0.3, 0.2, 0.2 and 0.1, the total soft penalty on a
converged timetable is around 11, well under 100.

### 4.3.5 Feasibility Analysis (NFR4)

A genetic algorithm cannot distinguish "no solution exists" from "I have not found the solution
yet" — both present as a population that stops improving. Left unaided it would exhaust its
generation budget and report a low fitness score, telling the administrator nothing about which
record to correct.

`feasibility.ts` therefore checks necessary conditions before the search begins: whether the
required session count exceeds the available room-periods, whether every course has at least
one qualified instructor, whether every batch fits in some room of the correct type, whether
any batch's weekly load exceeds the number of slots in the week, and whether any
sole-qualified instructor is asked for more periods than they have declared available. Failing
any of these is a proof of impossibility, reportable immediately in the administrator's own
vocabulary.

This check found a genuine defect in the project's own seed data during development:
laboratory capacity had been set at 40 while the BBA section A cohort numbers 55. The system
refused to run and reported *"No laboratory can seat batch BBA Sem 5A (55 students) for MGT315.
Add a laboratory with capacity of at least 55."* The data was corrected; the check was not
weakened.

### 4.3.6 Performance Engineering

A naive fitness function compares every gene with every other to detect clashes. At benchmark
scale that is roughly 204² comparisons × 100 population × 1000 generations — approximately four
billion operations, far outside the 120-second budget.

The implementation instead **buckets** occupancy: each (resource, slot) pair indexes into a
counter array, and a clash is recorded when a bucket already occupied is entered. Each gene is
touched once, so a full evaluation is linear in the number of scheduled periods. The scratch
buffers are allocated once and cleared in constant time using a generation-stamp technique,
which avoids allocating on the order of 100,000 large typed arrays over a benchmark run.

### 4.3.7 Refinements Beyond the Specification

The algorithm exactly as specified was implemented first and behaves as the literature
predicts: it removes violations rapidly at the outset and then plateaus. Two additions resolve
the plateau, and both can be switched off — which is how the ablation study of Section 5.4.5 is
produced.

**Random immigrants.** After 50 generations without improvement, the weakest individuals are
replaced with freshly randomised chromosomes. A converged population has no diversity left for
crossover to exploit; immigrants reintroduce it. Elites are never displaced, so the best
solution found so far is never at risk.

**Targeted repair.** Once converged, mutation is the only source of new material, and mutation
is blind: with 204 genes at rate 0.05, about ten genes change per offspring, chosen without
regard to which genes are causing the remaining clashes. The fitness evaluator already knows
which genes collided while it was counting violations, so the repair operator asks it, then
tries a bounded number of alternative placements for those specific genes, keeping a change
only if the total penalty falls. It is a strict improvement filter — it cannot make a
chromosome worse — and it leaves conflict-free chromosomes untouched.

The resulting hybrid of a genetic algorithm with local search is known in the literature as a
**memetic algorithm**.

### 4.3.8 Termination

The specification states that the loop runs until a chromosome achieves a fitness score of 1.0.
Taken literally, that condition can never be satisfied on real data: fitness is
1/(1 + total penalty) and the total penalty includes soft constraints, of which any realistic
timetable retains a few. The loop would always run its full generation budget.

The proposal's own expected outcomes resolve the ambiguity, writing "a fitness score of 1.0
**(zero hard constraint violations)**" — equating the two. Zero hard violations is therefore
the intended goal, and the implementation terminates once that has been reached and the soft
score has ceased improving. The literal 1.0 test is retained for the degenerate case where a
dataset admits a flawless timetable, and a unit test confirms that it fires.

Accordingly, the metric reported throughout Section 5.4 is **time to the first conflict-free
timetable**, since that is the moment at which the administrator has a usable result.

### 4.3.9 JWT Authentication

JWT stands for **JSON Web Token**: a compact, self-contained means of transmitting information
between two parties as a JSON object, used here for authentication and authorisation. A token
has three components:

- **Header** — the token type and the signing algorithm.
- **Payload** — the claims, here the user identifier and role.
- **Signature** — the header and payload signed with the server's secret, which is what makes
  the token unforgeable.

On successful login the server issues a signed token which the client presents on subsequent
requests. Passwords are stored as bcrypt hashes and are never stored or transmitted in plain
text. Role checks are enforced **on the server** in middleware, not in the client: a viewer who
manipulates the frontend to reveal an administrative control still receives `403 Forbidden`
from the API. Login failures return an identical message whether the email is unknown or the
password is wrong, so the endpoint cannot be used to enumerate valid accounts.

---

# Chapter 5: Implementation and Testing

## 5.1 Implementation

### 5.1.1 Tools Used

The following technologies and tools were used to develop the system:

**React.** React is the frontend library of the stack, providing a component-based framework
for the administrative screens and the timetable view. Its virtual DOM updates the interface
efficiently, which matters here because the convergence chart re-renders on every progress
event during a run. The declarative model keeps the displayed timetable synchronised with the
data returned by the API, and TypeScript throughout means the entity types shared with the
server are checked at compile time on both sides.

**Node.js.** Node.js is the backend runtime. Its event-driven, non-blocking I/O model allows the
server to hold open a server-sent-events connection to each watching browser while continuing
to serve other requests. Node.js was chosen specifically so that a single language could serve
the whole stack, enabling the shared validation package described in Section 4.1.1.

**Express.** Express is the backend framework, providing routing and middleware composition for
the REST API. Its middleware model is what makes authentication and role-based access control
expressible as two small functions applied uniformly to every protected route, rather than as
checks repeated in each handler and liable to be forgotten in one of them.

**PostgreSQL.** PostgreSQL is the relational database, accessed through the Prisma ORM. A
relational store was chosen over a document store deliberately: the institutional data is
highly relational — an assignment references a course, an instructor, a room, a slot and a
batch simultaneously — and referential integrity is exactly the property that must not be
violated in a scheduling system. Every relationship is a real foreign key, so the database
itself refuses to store an assignment referencing an instructor who has been deleted.

**Prisma.** Prisma provides typed data access and schema migrations, generating TypeScript
types directly from the schema so that a change to the data model becomes a compile error
everywhere it matters rather than a runtime failure in production.

**AG-Grid, Recharts, pdfmake and exceljs** provide, respectively, the interactive timetable
grid, the live convergence chart, PDF export and Excel export. **Zod** provides the shared
validation schemas, and **Vitest** the test runner.

**The genetic algorithm itself uses none of these.** It is written from scratch in plain
TypeScript with no dependency of any kind.

### 5.1.2 Implementation of Modules

**Authentication Module.** A user signs in with an email address and password. The server
compares the supplied password against a stored bcrypt hash and, on a match, issues a signed
JSON Web Token carrying the user's identifier and role. Every subsequent request presents this
token; middleware verifies the signature and attaches the user to the request. A second
middleware enforces the role requirement of the route. Failure to authenticate yields `401`,
and failure to authorise yields `403`, in both cases from the server regardless of the state of
the client.

**Data Management Module.** Seven screens provide CRUD over departments, programmes, courses,
instructors, rooms, batches and meeting times. Each screen submits to an endpoint that
validates the payload against the shared Zod schema; a validation failure returns `400` with
per-field messages that the form displays beside the offending inputs. Attempting to create a
record whose unique code already exists returns `409` with a readable message rather than a
database error, and attempting to delete a record that other records reference likewise returns
`409` rather than cascading a deletion the administrator did not intend. The instructor screen
additionally captures the expertise list and the weekly availability matrix that the algorithm
later enforces as hard constraints.

**Generation Module.** The administrator opens the Generate screen, adjusts the parameters if
desired, and submits. The service loads the institutional data, builds an indexed problem
context, and runs feasibility analysis. If the data is impossible the run is recorded as
infeasible and the specific reasons are returned with `422`, and no search is performed. If the
data is feasible a run record is created and `202 Accepted` is returned immediately with the
run identifier, so the browser can open the progress stream before the search proceeds. The
engine then evolves the population, yielding once per generation; the service relays each
generation's number, best fitness and violation counts over server-sent events, and the browser
advances the convergence chart live. On completion the best chromosome is decoded into
assignment tuples and persisted with the run's parameters, seed and convergence history.

**Live Progress Streaming.** The evolutionary loop is CPU-bound and synchronous, and Node.js is
single-threaded. Run straight through, it would occupy the process for the entire computation
and every queued progress event would be delivered in one burst after the search had already
finished — the "live" chart would in fact be a replay. The loop is therefore implemented as a
**generator** that yields once per generation. The synchronous `run()` drains it immediately,
for the CLI, the benchmarks and the tests; the asynchronous `runAsync()` drains it while
returning control to the event loop every few generations, so Express can flush each progress
event over the open connection while the search is still running. There is a single
implementation of Steps 2–7, so the two paths cannot diverge. Server-sent events were chosen
over WebSockets because the traffic is strictly one-directional, requires no additional
dependency or protocol upgrade, and reconnects automatically in the browser.

**Timetable View Module.** The generated timetable is rendered in an AG-Grid data grid with
three perspectives — by batch, by instructor and by room — each filterable, with lecture and
laboratory sessions distinguished by colour. The perspectives are views over the same
persisted assignments rather than three separate queries, so they cannot disagree with one
another.

**Export Module.** The timetable is exported to PDF via pdfmake and to Excel via exceljs, in
any of the three perspectives, giving six export combinations. Each export produces one page or
one worksheet per entity — per batch, per instructor or per room — which matches how timetables
are actually distributed within a college.

## 5.2 Testing

Sixty-five automated tests were written across three levels, arranged deliberately so that no
layer trusts another: the unit tests verify the operators in isolation, the property-based
tests re-verify the algorithm's output independently of the algorithm's own accounting, and the
integration tests exercise the HTTP API against a real database.

| Level | Count | Coverage |
|---|---|---|
| Unit and property-based | 43 | Every genetic operator, every constraint category, the RNG, the encoding |
| Integration | 22 | HTTP endpoints against a real database: auth, RBAC, CRUD, generation, export |

### 5.2.1 Test Environment

**Table 5.1: Test Environment Table**

| | |
|---|---|
| Operating System | macOS (darwin arm64) |
| Runtime | Node.js v20.19.5 |
| Browser | Google Chrome, Brave, Firefox |
| Database | PostgreSQL 16 (Docker) |
| Application Server | Node.js / Express |
| Test Runner | Vitest |
| Execution | Single-threaded |

### 5.2.2 Test Cases for Unit Testing

**Test authentication of a user**
*Test case:* Validation of email and password.
*Test objective:* To verify that only valid credentials grant access.
*Test description:* To check whether the supplied email and password match a stored account.
*Requirements verified:* FR6, valid user.

**Table 5.2: Test for Authentication of User**

| Action | Expected Result |
|---|---|
| Correct email and password entered | User is logged in and a signed token is issued |
| Wrong password entered | Generates an error message |
| Unknown email entered | Generates the **same** error message, so accounts cannot be enumerated |
| Request made with no token | 401 Unauthorized |

**Test role-based access control**
*Test case:* Viewer attempts administrative actions.
*Test objective:* To verify that authorisation is enforced on the server.
*Test description:* To check that a viewer cannot modify data or run the algorithm.
*Requirements verified:* FR6.

**Table 5.3: Test for Role-Based Access Control**

| Action | Expected Result |
|---|---|
| Viewer attempts to create a record | 403 Forbidden |
| Viewer attempts to update a record | 403 Forbidden |
| Viewer attempts to delete a record | 403 Forbidden |
| Viewer attempts to run the algorithm | 403 Forbidden |
| Viewer views or exports the timetable | Permitted |

**Test creating institutional records**
*Test case:* Create department, course, instructor, room, batch and meeting time.
*Test objective:* To register the data the algorithm requires.
*Test description:* To add each entity through its screen with valid and invalid input.
*Requirements verified:* FR1.

**Table 5.4: Test for Creating Institutional Records**

| Action | Expected Result |
|---|---|
| Create a record with all required fields valid | Record created |
| Create a record with a missing or malformed field | 400 with a message beside each offending field |
| Create a record whose unique code already exists | 409 with a readable message |
| Create an instructor with expertise and availability | Both stored and later enforced by the algorithm |

**Test updating and deleting records**
*Test case:* Update and delete existing records.
*Test objective:* To modify institutional data as it changes.
*Test description:* To edit and remove records, including referenced ones.
*Requirements verified:* FR1, valid user.

**Table 5.5: Test for Updating and Deleting Records**

| Action | Expected Result |
|---|---|
| Update a record's editable fields | Record updated |
| Update to a code already used by another record | 409 with a readable message |
| Delete an unreferenced record | Record deleted |
| Delete a record referenced by others | 409, deletion refused |

**Test constraint detection**
*Test case:* Detection of each hard and soft constraint violation.
*Test objective:* To verify the fitness evaluator counts every constraint category correctly.
*Test description:* To construct chromosomes deliberately violating each constraint in turn.
*Requirements verified:* FR2.

**Table 5.6: Test for Constraint Detection**

| Action | Expected Result |
|---|---|
| Fitness of a flawless timetable evaluated | Exactly 1.0 |
| Fitness formula checked against 1/(1+penalty) | Identity holds to 12 decimal places |
| Teacher placed in two sessions in one slot | Teacher conflict count > 0 |
| Room placed in two sessions in one slot | Room conflict count > 0 |
| Batch placed in two sessions in one slot | Batch conflict count > 0 |
| Batch larger than room capacity | Count equals the number of affected sessions |
| Laboratory session placed in a lecture hall | Count = 1 |
| Instructor placed outside declared availability | Count equals the number of affected sessions |
| Unqualified instructor assigned to a course | Count equals the number of affected sessions |
| Second period of a two-hour laboratory clashes | Conflict detected in the second period |
| Idle gaps counted for periods 1 and 4 | 2 gaps; 0 for adjacent periods |
| Bucketed counter compared with a naive O(n²) recount | Both agree on the existence of violations |

**Test genetic operators**
*Test case:* Behaviour of the RNG, initialisation, selection, crossover and mutation.
*Test objective:* To verify each operator individually before the loop is trusted.
*Test description:* To exercise each operator over many randomised trials.
*Requirements verified:* FR2.

**Table 5.7: Test for Genetic Operators**

| Action | Expected Result |
|---|---|
| Seeded RNG run twice with the same seed | Identical 100-value sequences |
| Population of 200 chromosomes initialised | Every gene lies within its eligible set |
| Tournament selection applied | Mean winner fitness exceeds population mean |
| Tournament size raised from k=2 to k=10 | Mean winner fitness increases |
| Tournament size set to k=1 | Mean winner fitness ≈ population mean (no pressure) |
| Crossover performed 100 times | Chromosome length unchanged |
| Offspring genes traced to parents | Every gene originates from one parent; none invented |
| Child mutated after crossover | Parents remain unchanged (no aliasing) |
| Mutation applied 500 rounds at rate 1.0 | Every resulting gene remains within its eligible set |
| Mutation applied to a laboratory session | Never starts in the final period of a day |

**Test feasibility analysis**
*Test case:* Detection of impossible input data.
*Test objective:* To verify that impossible datasets are rejected before the search runs.
*Test description:* To supply datasets violating each necessary condition.
*Requirements verified:* NFR4.

**Table 5.8: Test for Feasibility Analysis**

| Action | Expected Result |
|---|---|
| No room large enough for a batch | 422 naming the batch, the course and the capacity required |
| A course with no qualified instructor | 422 naming the course |
| Required periods exceed available room-periods | 422 stating both figures |
| A batch's weekly load exceeds the slots in a week | 422 naming the batch |
| A sole-qualified instructor oversubscribed | 422 naming the instructor |
| Feasible dataset submitted | Search proceeds normally |

### 5.2.3 Test Cases for System Testing

**Test timetable generation end to end**
*Test case:* Generate a timetable from seeded institutional data.
*Test objective:* To verify the system produces a conflict-free timetable.
*Test description:* To run the algorithm and re-inspect the persisted output independently.
*Requirements verified:* FR2, FR4, NFR1.

**Table 5.9: Test for Timetable Generation**

| Action | Expected Result |
|---|---|
| Generation run on a dataset admitting a flawless solution | Engine reaches fitness 1.0 |
| Generation run on a contended medium instance | 0 hard violations |
| Generation run end to end through the HTTP API | 0 hard violations, verified by independent re-inspection |
| 25 independent seeds run and each output re-checked | No double-booking in any run |
| Same seed run twice | Identical timetable produced |
| Best fitness observed across generations | Never decreases (elitism holds) |
| Laboratory session inspected in the result | Occupies two consecutive periods of one day |
| Progress observed during a run | Generation number and fitness update live |

**Test filtering and viewing the timetable**
*Test case:* View and filter the generated timetable.
*Test objective:* To verify the grid presents the result correctly in all three perspectives.
*Test description:* To switch perspectives and apply filters.
*Requirements verified:* FR3.

**Table 5.10: Test for Filtering and Viewing the Timetable**

| Action | Expected Result |
|---|---|
| Batch, instructor and room views opened | Each shows the same assignments from its own perspective |
| Filter applied by batch | Only that batch's sessions are shown |
| Filter applied by instructor or room | Only that entity's sessions are shown |
| Filter value with no matches applied | An empty grid is shown, with no error |
| Lecture and laboratory sessions compared | Visually distinguished by colour |

**Test export to PDF and Excel**
*Test case:* Export the timetable in each perspective and format.
*Test objective:* To verify that print-ready output is produced.
*Test description:* To export all six combinations and inspect the files.
*Requirements verified:* FR5.

**Table 5.11: Test for Export to PDF and Excel**

| Action | Expected Result |
|---|---|
| Export to PDF in each of the three views | Valid PDF produced, correct magic bytes, one page per entity |
| Export to Excel in each of the three views | Valid XLSX produced, correct magic bytes |
| Batch export to Excel inspected | 12 worksheets, one per batch, each uniquely named |
| Export attempted before any timetable exists | Handled with a message, not an error page |

**Test data integrity**
*Test case:* Integrity of stored data.
*Test objective:* To verify data is stored, retrieved and updated correctly.
*Test description:* To compare what was entered with what is stored and displayed.
*Requirements verified:* NFR3.

**Table 5.12: Test for Data Integrity**

| Action | Expected Result |
|---|---|
| Timetable generated and persisted | Assignments present in both the database and the grid |
| Persisted assignments compared with entered data | Course, instructor, room, slot and batch all match |
| Run's parameters and seed inspected after completion | Stored with the run, and the run is reproducible from them |
| Referenced record deletion attempted | Refused by a foreign key constraint |

**Test error handling**
*Test case:* Error handling across the system.
*Test objective:* To verify that appropriate messages are shown for invalid input.
*Test description:* To supply invalid data and observe the messages produced.
*Requirements verified:* Valid user, NFR4.

**Table 5.13: Test for Error Handling**

| Action | Expected Result |
|---|---|
| Wrong email or password entered | "Invalid email or password" |
| Malformed input submitted | 400 with a message for each offending field |
| Duplicate unique code submitted | 409 with a readable message |
| Impossible dataset submitted for generation | 422 naming the specific record at fault |
| Unauthenticated request made to any entity endpoint | 401 |

### 5.2.4 A Defect Found by Testing

The batch-export test in Table 5.11 exists because of a real defect. Every programme in the
dataset runs a section labelled "Semester 5A", and batch labels initially omitted the programme
code. Excel forbids duplicate worksheet names, so the batch export failed with HTTP 500. The
same ambiguity caused the timetable screen's filter dropdown to display several
indistinguishable "Semester 5A" entries.

The fix was to carry the programme code into every batch label, which corrected the export and
the user interface together, with a uniqueness guard in the export as a second line of defence.
This is recorded here because it is what testing actually caught, and because a testing section
that reports only passes has not demonstrated that the tests were capable of failing.

## 5.3 Result Analysis

All measurements below were produced by `npm run bench`, which writes raw data to
`benchmarks/results/*.csv`. Every run is seeded, so the figures are reproducible on equivalent
hardware.

**Test environment:** Node.js v20.19.5, macOS (darwin arm64), single-threaded execution.

## 5.4 Performance Evaluation

### 5.4.1 NFR1 Compliance

Ten independent seeded runs on the exact configuration named in NFR1 — six programmes, thirty
courses, twenty teachers, fifteen rooms — comprising 204 class sessions occupying 228 periods,
with all parameters at their defaults.

**Table 5.14: NFR1 Compliance over Ten Seeded Runs**

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

**Table 5.15: Summary of NFR1 Compliance**

| Metric | Mean | Median | Worst | Budget | Verdict |
|---|---:|---:|---:|---:|:--|
| Time to conflict-free timetable | 753 ms | 750 ms | 800 ms | 120,000 ms | **PASS** (150× margin) |
| Generations to conflict-free | 13.2 | 13 | 14 | 500 | **PASS** (36× margin) |
| Hard-constraint violations | 0 | 0 | 0 | 0 | **PASS** (10/10 runs) |

Every run terminated with the reason `soft-converged`: a conflict-free timetable was found
within fourteen generations, after which the algorithm continued refining soft preferences
until those too stopped improving. The wide gap between time to conflict-free (under one
second) and total time (16–22 seconds) is entirely soft-constraint polishing, and is optional —
the administrator has a usable timetable long before the run completes.

### 5.4.2 Convergence Behaviour

A representative run, sampled every five generations:

**Table 5.16: Convergence Behaviour of a Representative Run**

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
violations fall steeply — 106 to 11 in ten generations — because early in the search almost any
change is an improvement and selection pressure is strong. The step from generation 10 to 15,
where the last eleven conflicts are eliminated, produces a 35-fold jump in fitness, because
removing a hard violation is worth 100 penalty units against a total that is by then small.

After generation 15 the curve flattens and climbs slowly: with no conflicts left, the only
remaining gains are soft, and each is worth a fraction of a penalty unit. Soft violations fall
from 144 to 60 over the remaining generations — a genuine improvement in timetable quality,
meaning fewer idle hours for teachers and a better spread of classes for students, that is
invisible in the hard-constraint count.

<div align="center">

«Figure 5.1 — Convergence of best fitness against generation»

**Figure 5.1: Convergence of Best Fitness Against Generation**

</div>

### 5.4.3 Parameter Sweep

Twenty-seven configurations, three seeds each, generation ceiling 400. Every configuration
solved every run, so the discriminating metrics are speed of convergence and final soft
quality. Representative rows are shown.

**Table 5.17: Parameter Sweep Results**

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

**1. The mutation rate dominates, and the specified default is not optimal.** This is the
clearest result in the study. Moving from 0.05 to 0.01 improves both metrics substantially: at
population 100 and crossover 0.8, convergence improves from 13.3 to 10.0 generations, and final
fitness more than doubles, from 0.0816 to 0.1808. Moving in the other direction, to 0.10, is
markedly worse on both counts — 29.7 generations and a fitness of 0.0365.

The mechanism is that mutation is a disruptive operator. At 204 genes, a rate of 0.10 changes
about twenty genes per offspring, destroying good partial solutions faster than selection can
consolidate them. Since the targeted repair operator already supplies the directed diversity
that a high mutation rate was compensating for, a low background rate suffices. The value 0.05
has been retained as the shipped default so that the running system matches the specification,
and 0.01 is reported as an empirical improvement; changing it is a one-field edit on the
Generate screen.

**2. The crossover rate barely matters.** Across all populations and mutation rates, varying
crossover between 0.6 and 0.95 changes convergence by roughly one generation. This is not the
null result it appears to be: it indicates that in this problem progress comes predominantly
from mutation and repair rather than from recombination — which is plausible, since two
conflict-free partial timetables recombined at an arbitrary point frequently reintroduce
clashes at the seam.

**3. Larger populations converge in fewer generations but not in less time.** Population 200
reaches a solution in 9.3 generations against 10.0 for population 100, but takes 1,034 ms
against 562 ms, because each generation costs twice as much to evaluate. Population 50 is the
fastest in wall-clock terms at this problem size. The default of 100 is a reasonable middle
choice and has been retained.

### 5.4.4 Scalability

Four instances of increasing size, three seeds each, generation ceiling 600. The search-space
column is log₁₀ of the product of each gene's option count — the number of distinct timetables
the algorithm is choosing between.

**Table 5.18: Scalability Results**

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
evaluation is linear in the number of periods; and more generations are needed, because a
larger instance is more tightly constrained — more sessions compete for the same 36 weekly
slots, so conflicts are harder to resolve without creating new ones.

**The stress instance did not converge within 600 generations, in any of three runs.** This is
reported as measured. The instance is feasible in principle — 660 required periods against
1,152 available room-periods, with no batch or instructor oversubscribed — but the algorithm
did not find a conflict-free arrangement within the budget, plateauing instead with a small
number of residual violations. Two observations follow. First, this is well beyond the scale
NFR1 specifies: 600 sessions across 30 batches is roughly three times the benchmark
configuration and larger than any single college affiliated to Tribhuvan University would
schedule as one unit. Second, it marks a real ceiling in the current implementation rather than
a mere budget shortfall, and Section 6.2 records the two changes most likely to raise it.

<div align="center">

«Figure 5.2 — Time to conflict-free timetable against input size»

**Figure 5.2: Time to Conflict-Free Timetable Against Input Size**

</div>

### 5.4.5 Ablation of the Documented Refinements

Five seeds per variant, generation ceiling 500, on the benchmark instance. This measures the
contribution of the two additions described in Section 4.3.7.

**Table 5.19: Ablation of the Documented Refinements**

| Variant | Repair | Immigrants | Solved | Mean generations to solve | Mean ms to solve | Mean final hard violations |
|---|:--:|:--:|:--:|---:|---:|---:|
| Specification only (Steps 1–7) | off | off | **0/5** | — | — | 6.40 |
| Plus random immigrants | off | on | **0/5** | — | — | 6.40 |
| Plus targeted repair | on | off | **5/5** | 13.4 | 787 ms | 0.00 |
| Both (shipped default) | on | on | **5/5** | 13.4 | 789 ms | 0.00 |

This is the most consequential result in the study, and it should be stated plainly.

**The algorithm exactly as specified does not solve the benchmark instance.** Across five
independent seeds it plateaued at an average of 6.4 hard-constraint violations and never
recovered within 500 generations. Steps 1–7 are a correct and faithful description of a genetic
algorithm; they are simply not sufficient for this problem at this scale.

**Targeted repair is the single change that makes the system work.** Adding it takes the solve
rate from 0/5 to 5/5, in a mean of 13.4 generations. Random immigrants, by contrast, contribute
nothing measurable: 0/5 without repair, and no improvement in generations or time when added
alongside it.

The explanation is that the two operators address different failure modes, and only one of them
is the operative failure here. Immigrants restore *population diversity*, which helps when a
population has collapsed onto a single genotype. Repair supplies *directed* change, which is
what is needed when the population is diverse enough but mutation is too blind to find the few
genes causing the remaining conflicts — with 204 genes and a 0.05 rate, roughly ten genes
change per offspring, chosen without regard to which are actually clashing. The measurements
say the second problem is the binding one.

Random immigrants are retained in the shipped default because they cost nothing measurable
(789 ms against 787 ms) and provide insurance against a different failure mode on datasets
unlike this benchmark. That is a judgement, not a result, and it is recorded as such.

### 5.4.6 Achievement Against the Expected Outcomes

**Table 5.20: Achievement Against the Proposal's Expected Outcomes**

| Expected outcome | Result |
|---|---|
| 1. Fully functional web application producing conflict-free timetables with zero double-bookings or capacity overflows | **Achieved.** Verified by property-based tests over 25 independent runs and by direct re-inspection of persisted output. |
| 2. Custom GA in TypeScript reaching zero hard violations within 500 generations, well under 120 seconds | **Achieved.** 13.2 generations and 753 ms mean over 10 seeds — 36× and 150× inside the respective budgets. |
| 3. Interactive multi-perspective timetable view with lecture/laboratory differentiation | **Achieved.** AG-Grid, three views, filtering, colour coding. |
| 4. Print-ready PDF and spreadsheet export | **Achieved.** Six export combinations, one page or worksheet per entity. |
| 5. Documented performance analysis: convergence graphs, parameter comparison, time against input size | **Achieved.** Sections 5.4.1–5.4.5, all regenerable from `npm run bench`. |
| 6. Comprehensive report with UML diagrams, design, implementation and testing | **Achieved.** This document and [`UML.md`](UML.md). |

All components of the system function as intended. The genetic algorithm produces conflict-free
timetables well within budget; the interface presents them in three filterable perspectives
with lectures and laboratories distinguished; the export module produces print-ready output in
both formats; and the feasibility checker reports impossible data specifically rather than
failing silently.

---

# Chapter 6: Conclusion and Future Recommendation

## 6.1 Conclusion

This project delivers a working web application that reduces college timetable construction
from a two-to-three-week manual process to a sub-second computation, on the exact configuration
the proposal specified. All six functional and all four non-functional requirements are met,
and the two headline performance targets are met with margins of 36× and 150×.

The core contribution is a Genetic Algorithm written from scratch in TypeScript, with no
optimisation library of any kind. Its seven stages follow the specification precisely, and the
three places where the implementation departs from or extends that specification — the added
batch-conflict constraint, the rescaled soft weights, and the targeted repair operator — are
each documented in the code, justified in this report, and quantified in Section 5.4.5.

The most valuable finding of the work is the one recorded in Section 5.4.5: the textbook
genetic algorithm, implemented faithfully, does not solve this problem. It converges to within
a handful of violations and stops. What closes that final gap is hybridisation with a directed
local search, and the measured difference between the two is the difference between a system
that works and one that does not. The parameter sweep produced a second finding of the same
character — that the specified mutation rate is measurably suboptimal for this problem, and
that 0.01 converges faster and yields better timetables than 0.05.

Both findings are consequences of having built the benchmarking apparatus rather than asserting
the performance claims, and that is the methodological lesson taken from the project.

## 6.2 Limitations

1. **No completeness guarantee.** The algorithm cannot prove that no timetable exists. The
   feasibility checker detects only the necessary conditions implemented in Section 4.3.5.
2. **A scalability ceiling below 600 sessions.** Section 5.4.4 records the failure as measured.
   Raising it most likely requires seeding the initial population with a greedy construction
   heuristic rather than at random, and parallelising fitness evaluation across worker threads.
3. **Hand-tuned soft weights,** chosen empirically rather than derived, and not configurable
   per institution.
4. **Fixed two-period laboratories.** The encoding supports arbitrary durations; the user
   interface does not expose the setting.
5. **No mid-semester rescheduling.** Regeneration produces a fresh timetable rather than
   minimally perturbing the existing one.
6. **Single-tenant.** One deployment serves one institution.

## 6.3 Future Recommendations

**Minimal-perturbation rescheduling** is the most valuable extension. When one instructor
becomes unavailable in week eight, an administrator needs the smallest set of changes that
restores feasibility — not a completely different timetable that invalidates every printed
copy. This is expressible within the current architecture by adding a penalty term for distance
from the existing schedule and seeding the population with that schedule.

**Greedy population seeding.** Initialising with a graph-colouring or largest-degree-first
heuristic instead of at random would start the search from a far better region of the space,
and is the most promising route past the scalability ceiling recorded in Section 5.4.4.

**Parallel fitness evaluation** across `worker_threads`. Evaluation is the dominant cost of a
generation and is embarrassingly parallel across a population.

**Per-institution constraint configuration,** so that soft-constraint weights and the hard
constraint set can be adjusted without a code change.

**Integration with external calendars** and with the college's student information system, so
that a published timetable propagates to the people who must act on it rather than being
distributed as a file.

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
| «Screenshot 1» | Login screen — `docs/screenshots/01-login.png` |
| «Screenshot 2» | Administrator dashboard — `docs/screenshots/02-dashboard.png` |
| «Screenshot 3» | Generate screen with parameters — `docs/screenshots/03-generate-before.png` |
| «Screenshot 4» | Generation in progress, live convergence chart — `docs/screenshots/04-generating-live.png` |
| «Screenshot 5» | Generation complete — `docs/screenshots/05-generate-complete.png` |
| «Screenshot 6» | Timetable, batch view — `docs/screenshots/06-timetable-batch.png` |
| «Screenshot 7» | Timetable, teacher view — `docs/screenshots/07-timetable-teacher.png` |
| «Screenshot 8» | Performance analysis screen — `docs/screenshots/08-analysis.png` |

## Appendix B — Selected Source Code

**Fitness evaluation (`server/src/ga/fitness.ts`)**

```typescript
// f = 1 / (1 + total penalty). Hard violations weigh 100 each; soft weights are
// fractional so that all soft violations together cost less than one hard violation.
const totalPenalty =
  HARD_WEIGHT * hardViolations +
  SOFT_WEIGHTS.instructorIdleGap     * idleGaps +
  SOFT_WEIGHTS.batchDayImbalance     * dayImbalance +
  SOFT_WEIGHTS.consecutiveSameCourse * consecutiveSame +
  SOFT_WEIGHTS.roomUtilisation       * utilisationSpread;

const fitness = 1 / (1 + totalPenalty);
```

**Tournament selection (`server/src/ga/selection.ts`)**

```typescript
// Depends only on the ordering of fitness values, never their spacing, so selection
// pressure survives the compression of 1/(1+penalty) scores.
export function tournamentSelect(pop: Individual[], k: number, rng: Rng): Individual {
  let best = pop[rng.int(pop.length)];
  for (let i = 1; i < k; i++) {
    const challenger = pop[rng.int(pop.length)];
    if (challenger.fitness > best.fitness) best = challenger;
  }
  return best;
}
```

**Single-point crossover (`server/src/ga/crossover.ts`)**

```typescript
// Gene i of every chromosome answers the same question — "where does requirement i go?"
// so any split point yields exactly one placement per requirement and needs no repair.
export function crossover(a: Chromosome, b: Chromosome, rng: Rng): Chromosome {
  const point = 1 + rng.int(a.length - 1);
  const child = new Array<Gene>(a.length);
  for (let i = 0; i < a.length; i++) {
    const src = i < point ? a[i] : b[i];
    child[i] = { ...src };            // copied, never aliased to a parent
  }
  return child;
}
```

**Targeted repair (`server/src/ga/repair.ts`)**

```typescript
// The fitness evaluator already knows which genes collided. Ask it, then try a bounded
// number of alternative placements for those genes only, keeping a change only if the
// total penalty falls. A strict improvement filter: it can never make a chromosome worse.
for (const geneIndex of conflictedGenes) {
  const before = evaluate(chromosome).penalty;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const original = chromosome[geneIndex];
    chromosome[geneIndex] = randomEligiblePlacement(ctx, geneIndex, rng);
    if (evaluate(chromosome).penalty >= before) chromosome[geneIndex] = original;
    else break;
  }
}
```

## Appendix C — Reproducing the Results

```bash
npm run db:up && npm run setup      # database and seed data
npm test                            # 65 tests
npm run bench:nfr1                  # Table 5.14  (~3 minutes)
npm run bench:sweep                 # Table 5.17  (~18 minutes)
npm run bench:scale                 # Table 5.18  (~8 minutes)
npm run bench:ablation              # Table 5.19  (~10 minutes)
```

Raw data is written to `benchmarks/results/*.csv`. All runs are seeded, so every figure in
Chapter 5 is reproducible on equivalent hardware.
