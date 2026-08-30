# UML Diagrams

Expected Outcome 6 requires "complete system analysis with UML diagrams". Every diagram
below is written in Mermaid, which renders directly on GitHub and in VS Code, and can be
exported to PNG for the printed report.

---

## 1. Use Case Diagram

Two actors, matching the role split of FR6. The administrator has every viewer capability
plus the ability to modify data and run the algorithm.

```mermaid
flowchart LR
  Admin(["Administrator"])
  Viewer(["Viewer<br/>(Department Head)"])

  subgraph System["Automated College Timetable Generator"]
    UC1["Sign in"]
    UC2["Manage departments,<br/>programmes and courses"]
    UC3["Manage instructors<br/>(expertise + availability)"]
    UC4["Manage rooms,<br/>batches and time slots"]
    UC5["Validate data feasibility"]
    UC6["Generate timetable"]
    UC7["Monitor generation progress"]
    UC8["View timetable<br/>(batch / teacher / room)"]
    UC9["Filter timetable"]
    UC10["Export to PDF / Excel"]
    UC11["Review run history<br/>and performance"]
  end

  Admin --- UC1
  Admin --- UC2
  Admin --- UC3
  Admin --- UC4
  Admin --- UC5
  Admin --- UC6
  Admin --- UC7
  Admin --- UC8
  Admin --- UC10
  Admin --- UC11

  Viewer --- UC1
  Viewer --- UC8
  Viewer --- UC10
  Viewer --- UC11

  UC6 -.->|"&laquo;include&raquo;"| UC5
  UC6 -.->|"&laquo;include&raquo;"| UC7
  UC8 -.->|"&laquo;extend&raquo;"| UC9
```

---

## 2. Class Diagram

The domain entities of proposal section 4.3.4, together with the algorithm classes. Note
that `FitnessEvaluator`, `GeneticAlgorithm` and the operator modules depend only on
`ProblemContext` -- they never touch Prisma, which is what makes them unit-testable without
a database.

```mermaid
classDiagram
  class Department {
    +String id
    +String code
    +String name
  }
  class Program {
    +String id
    +String code
    +String name
    +int totalSemesters
  }
  class Course {
    +String id
    +String code
    +String name
    +int creditHours
    +int lecturesPerWeek
    +int labsPerWeek
    +CourseType type
  }
  class Instructor {
    +String id
    +String name
    +String email
  }
  class Room {
    +String id
    +String number
    +int capacity
    +RoomType type
  }
  class Batch {
    +String id
    +int semester
    +String section
    +int studentCount
  }
  class MeetingTime {
    +String id
    +Day day
    +int period
    +String startTime
    +String endTime
  }
  class InstructorAvailability {
    +boolean isAvailable
  }
  class ScheduleRun {
    +String id
    +RunStatus status
    +GAConfig config
    +float bestFitness
    +int generationsRun
    +int durationMs
  }
  class ScheduleAssignment {
    +String id
    +SessionType sessionType
    +String sessionGroupId
  }

  Department "1" --> "*" Course
  Department "1" --> "*" Instructor
  Department "1" --> "*" Program
  Program "1" --> "*" Batch
  Instructor "*" -- "*" Course : qualified for
  Batch "*" -- "*" Course : enrolled in
  Instructor "1" --> "*" InstructorAvailability
  MeetingTime "1" --> "*" InstructorAvailability
  ScheduleRun "1" --> "*" ScheduleAssignment
  ScheduleAssignment --> Course
  ScheduleAssignment --> Instructor
  ScheduleAssignment --> Room
  ScheduleAssignment --> MeetingTime
  ScheduleAssignment --> Batch

  class ProblemContext {
    +SessionRequirement[] requirements
    +Uint8Array availability
    +Uint8Array qualification
    +isAvailable(i, slot) boolean
    +isQualified(i, course) boolean
  }
  class SessionRequirement {
    +int courseIndex
    +int batchIndex
    +SessionType sessionType
    +int duration
    +int[] eligibleInstructors
    +int[] eligibleRooms
    +int[] eligibleStartSlots
  }
  class Gene {
    +int instructorIndex
    +int roomIndex
    +int startSlot
  }
  class FitnessEvaluator {
    +evaluate(chromosome) FitnessBreakdown
    +conflictedGenes int[]
  }
  class GeneticAlgorithm {
    -GAConfig config
    -Rng rng
    +run() GAResult
    +runAsync() Promise~GAResult~
  }
  class Rng {
    -int state
    +next() float
  }

  ProblemContext "1" --> "*" SessionRequirement
  GeneticAlgorithm --> ProblemContext
  GeneticAlgorithm --> FitnessEvaluator
  GeneticAlgorithm --> Rng
  FitnessEvaluator --> ProblemContext
  GeneticAlgorithm ..> Gene : evolves arrays of
```

---

## 3. Entity Relationship Diagram

The PostgreSQL schema. Every relationship shown is enforced by a real foreign key, as NFR3
requires.

```mermaid
erDiagram
  USER ||--o{ SCHEDULE_RUN : "starts"
  DEPARTMENT ||--o{ COURSE : "offers"
  DEPARTMENT ||--o{ INSTRUCTOR : "employs"
  DEPARTMENT ||--o{ PROGRAM : "administers"
  PROGRAM ||--o{ BATCH : "enrols"
  COURSE }o--o{ INSTRUCTOR : "qualified to teach"
  COURSE }o--o{ BATCH : "studied by"
  INSTRUCTOR ||--o{ INSTRUCTOR_AVAILABILITY : "declares"
  MEETING_TIME ||--o{ INSTRUCTOR_AVAILABILITY : "covered by"
  SCHEDULE_RUN ||--o{ SCHEDULE_ASSIGNMENT : "produces"
  COURSE ||--o{ SCHEDULE_ASSIGNMENT : "scheduled as"
  INSTRUCTOR ||--o{ SCHEDULE_ASSIGNMENT : "teaches"
  ROOM ||--o{ SCHEDULE_ASSIGNMENT : "hosts"
  MEETING_TIME ||--o{ SCHEDULE_ASSIGNMENT : "occupies"
  BATCH ||--o{ SCHEDULE_ASSIGNMENT : "attends"

  USER {
    string id PK
    string name
    string email UK
    string passwordHash
    enum role
  }
  DEPARTMENT {
    string id PK
    string code UK
    string name
  }
  PROGRAM {
    string id PK
    string code UK
    string name
    int totalSemesters
    string departmentId FK
  }
  COURSE {
    string id PK
    string code UK
    string name
    int creditHours
    int lecturesPerWeek
    int labsPerWeek
    enum type
    string departmentId FK
  }
  INSTRUCTOR {
    string id PK
    string name
    string email UK
    string departmentId FK
  }
  ROOM {
    string id PK
    string number UK
    string building
    int capacity
    enum type
  }
  BATCH {
    string id PK
    string programId FK
    int semester
    string section
    int studentCount
  }
  MEETING_TIME {
    string id PK
    enum day
    int period
    string startTime
    string endTime
  }
  INSTRUCTOR_AVAILABILITY {
    string instructorId PK_FK
    string meetingTimeId PK_FK
    bool isAvailable
  }
  SCHEDULE_RUN {
    string id PK
    enum status
    json config
    float bestFitness
    int generationsRun
    int durationMs
    int hardViolations
    int softViolations
    json breakdown
    json convergence
    string createdById FK
  }
  SCHEDULE_ASSIGNMENT {
    string id PK
    string runId FK
    string courseId FK
    string instructorId FK
    string roomId FK
    string meetingTimeId FK
    string batchId FK
    enum sessionType
    string sessionGroupId
  }
```

---

## 4. Sequence Diagram: Timetable Generation

Shows why the generation endpoint returns `202 Accepted` immediately rather than blocking:
the browser must be able to open the progress stream and watch the run it just started.

```mermaid
sequenceDiagram
  actor Admin
  participant UI as React Client
  participant API as Express API
  participant SVC as ScheduleService
  participant GA as GeneticAlgorithm
  participant DB as PostgreSQL

  Admin->>UI: Click "Generate timetable"
  UI->>API: POST /api/schedule/generate
  API->>API: requireAuth + requireRole(ADMIN)
  API->>SVC: startRun(userId, config)
  SVC->>DB: load courses, instructors, rooms,<br/>batches, meeting times
  DB-->>SVC: institutional data
  SVC->>SVC: build ProblemContext (index all entities)
  SVC->>SVC: analyseFeasibility()

  alt Input is infeasible (NFR4)
    SVC->>DB: record run as INFEASIBLE
    SVC-->>API: throw with reasons
    API-->>UI: 422 + specific problems
    UI-->>Admin: "No laboratory can seat batch BBA Sem 5A"
  else Input is feasible
    SVC->>DB: create ScheduleRun (RUNNING)
    SVC-->>API: runId
    API-->>UI: 202 Accepted { runId }
    UI->>API: GET /runs/:id/stream (EventSource)

    SVC->>GA: runAsync()
    loop Until conflict-free or 1000 generations
      GA->>GA: Step 3 evaluate fitness
      GA->>GA: Step 4 tournament selection
      GA->>GA: Step 5 single-point crossover
      GA->>GA: Step 6 mutation + targeted repair
      GA-->>SVC: GenerationProgress
      SVC-->>UI: SSE progress event
      UI-->>Admin: chart advances live
      GA->>GA: yield to event loop
    end

    GA-->>SVC: GAResult (best chromosome)
    SVC->>SVC: decodeChromosome()
    SVC->>DB: save assignments + convergence + breakdown
    SVC-->>UI: SSE completed event
    UI-->>Admin: "Conflict-free timetable found at generation 13"
  end
```

---

## 5. Activity Diagram: The Genetic Algorithm

The seven steps of proposal section 4.3.2, with the two documented refinements marked.

```mermaid
flowchart TD
  Start([Start]) --> Load[Load institutional data]
  Load --> Expand["Step 1: Session expansion<br/>one gene per required session"]
  Expand --> Feas{"Feasible?<br/>(NFR4 pre-flight)"}
  Feas -->|No| Report[Report specific problems] --> Stop([Stop])
  Feas -->|Yes| Init["Step 2: Initialise population<br/>N = 100 random chromosomes"]
  Init --> Eval["Step 3: Evaluate fitness<br/>f = 1 / (1 + total_penalty)"]
  Eval --> Check{"Zero hard violations<br/>and soft converged?"}
  Check -->|Yes| Decode
  Eval --> GenCheck{"Generation = 1000?"}
  GenCheck -->|Yes| Decode["Decode best chromosome"]
  GenCheck -->|No| Elite["Carry forward top 20% (elitism)"]
  Elite --> Stagnant{"Stagnant for<br/>50 generations?"}
  Stagnant -->|Yes| Immigrants["Refinement: inject random immigrants<br/>+ raise mutation rate"]
  Stagnant -->|No| Select
  Immigrants --> Select["Step 4: Tournament selection, k = 5"]
  Select --> Cross["Step 5: Single-point crossover, rate 0.8"]
  Cross --> Mutate["Step 6: Mutation, per-gene rate 0.05"]
  Mutate --> Repair["Refinement: targeted repair<br/>of conflicted genes"]
  Repair --> Eval
  Decode --> Persist[Save assignments to database] --> Render[Render in grid / export] --> Stop
```

---

## 6. Component and Deployment Diagram

The three-tier architecture of proposal section 4.3.1.

```mermaid
flowchart TB
  subgraph Browser["Client tier — Browser"]
    React["React 18 + TypeScript"]
    AgGrid["AG-Grid Community<br/>(timetable grid, FR3)"]
    Recharts["Recharts<br/>(convergence chart, FR4)"]
    React --- AgGrid
    React --- Recharts
  end

  subgraph Server["Application tier — Node.js 20"]
    Express["Express REST API"]
    Auth["JWT auth + RBAC<br/>(FR6)"]
    Validate["Zod validation<br/>(shared with client)"]
    subgraph Engine["Genetic Algorithm engine — zero dependencies"]
      Context["ProblemContext"]
      Fitness["FitnessEvaluator"]
      Ops["selection / crossover<br/>mutation / repair"]
      Loop["GeneticAlgorithm"]
    end
    Export["Export module<br/>exceljs + pdfmake (FR5)"]
    Express --- Auth
    Express --- Validate
    Express --- Engine
    Express --- Export
  end

  subgraph Data["Data tier"]
    Postgres[("PostgreSQL 16")]
  end

  subgraph SharedPkg["@schedular/shared"]
    Types["Entity types, Zod schemas,<br/>GA constants"]
  end

  Browser -->|"REST over HTTP"| Express
  Browser -->|"Server-Sent Events"| Express
  Express -->|"Prisma ORM"| Postgres
  Types -.->|imported by| Browser
  Types -.->|imported by| Server
```

---

## 7. State Diagram: Lifecycle of a Schedule Run

A `ScheduleRun` row is the system's unit of work. Its states are persisted, so a run's
outcome — including the reason an infeasible dataset was rejected — survives a page reload
or a server restart.

```mermaid
stateDiagram-v2
  [*] --> Draft: Administrator opens Generate screen
  Draft --> Validating: Submit parameters
  Validating --> Infeasible: analyseFeasibility() fails (NFR4)
  Infeasible --> [*]: Reasons reported, no search run
  Validating --> Running: Necessary conditions hold
  Running --> Running: Generation completed<br/>(progress streamed over SSE)
  Running --> ConflictFree: Zero hard violations reached
  ConflictFree --> ConflictFree: Soft polishing continues
  ConflictFree --> Completed: Soft score stops improving
  Running --> Exhausted: Generation ceiling reached<br/>with violations remaining
  Running --> Failed: Server or database error
  Completed --> [*]: Assignments persisted, exportable
  Exhausted --> [*]: Best-effort result retained for analysis
  Failed --> [*]
```

---

## 8. Object Diagram: A Snapshot During Generation

One instant of a benchmark run — generation 13, the moment the first conflict-free
chromosome appears. It shows concrete instances rather than classes, which is what makes
the encoding of §4.3 of the report tangible: gene 47 holds only the three free variables,
while the course, batch and session type are read from requirement 47.

```mermaid
flowchart TB
  ctx["ctx : ProblemContext<br/>requirements = 204<br/>periods = 228<br/>meetingTimes = 36"]
  req["req47 : SessionRequirement<br/>courseId = CSC318<br/>batchId = BSCCSIT-5A<br/>sessionType = LAB<br/>duration = 2"]
  ind["best : Individual<br/>fitness = 0.030864<br/>hardViolations = 0<br/>softViolations = 144"]
  chrom["chromosome : Gene[204]"]
  gene["gene47 : Gene<br/>instructorId = INS-07<br/>roomId = LAB-02<br/>startSlot = 21"]
  ins["ins07 : Instructor<br/>name = R. Shrestha<br/>expertise = {CSC318, CSC322}"]
  room["lab02 : Room<br/>capacity = 60<br/>type = LABORATORY"]
  mt["mt21 : MeetingTime<br/>day = WED<br/>period = 3"]
  run["run : ScheduleRun<br/>status = RUNNING<br/>seed = 89<br/>generation = 13"]

  ctx --> req
  run --> ind
  ind --> chrom
  chrom -->|"index 47"| gene
  gene -.->|"describes"| req
  gene --> ins
  gene --> room
  gene --> mt
```
