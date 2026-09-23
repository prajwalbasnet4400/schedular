# UML Diagrams

Expected Outcome 6 requires "complete system analysis with UML diagrams". Every diagram
below is written in Mermaid, which renders directly on GitHub and in VS Code, and can be
exported to PNG for the printed report.

---

## 1. Use Case Diagram

One actor. There is no login, so anyone who opens the page can edit the data, generate and view.

```mermaid
flowchart LR
  User(["User<br/>(Administrator)"])

  subgraph System["Automated College Timetable Generator"]
    UCD["Edit college data<br/>(courses, teachers, rooms, batches)"]
    UC0["Set GA parameters"]
    UC1["Generate timetable"]
    UC2["Watch generation progress"]
    UC3["View timetable"]
    UC4["By batch"]
    UC5["By teacher"]
    UC6["By room"]
  end

  User --- UCD
  User --- UC0
  User --- UC1
  User --- UC3

  UC1 -.->|"&laquo;include&raquo;"| UC2
  UC4 -.->|"&laquo;extend&raquo;"| UC3
  UC5 -.->|"&laquo;extend&raquo;"| UC3
  UC6 -.->|"&laquo;extend&raquo;"| UC3
```

---

## 2. Activity Diagram: The Genetic Algorithm

The seven steps of proposal section 4.3.2, with our one addition (targeted repair) marked.

```mermaid
flowchart TD
  Start([Start]) --> Load["Load college data<br/>(sample in src/data.ts,<br/>as edited on the page)"]
  Load --> Expand["Step 1: Build problem<br/>one gene per session (48 in the sample),<br/>qualified teachers + rooms that fit"]
  Expand --> Valid{"Course codes unique and known,<br/>every course has a teacher,<br/>every batch fits a room?"}
  Valid -->|No| Error["Show error naming the course / batch,<br/>disable Generate"] --> Stop([Stop])
  Valid -->|Yes| Init["Step 2: Random population<br/>N = 100"]
  Init --> Eval["Step 3: Evaluate fitness<br/>f = 1 / (1 + penalty)"]
  Eval --> Rank["Rank by fitness,<br/>report progress to chart"]
  Rank --> Done{"Fitness = 1.0, or<br/>clash-free and no improvement<br/>for 20 generations, or<br/>generation = 1000?"}
  Done -->|Yes| Show["Show best timetable"] --> Stop
  Done -->|No| Elite["Keep top 20% unchanged (elitism)"]
  Elite --> Select["Step 4: Tournament selection, k = 5"]
  Select --> Cross["Step 5: Single-point crossover, rate 0.8<br/>(else copy one parent)"]
  Cross --> Mutate["Step 6: Mutation, per-gene rate 0.05<br/>(new room, slot or both)"]
  Mutate --> Repair["Addition: targeted repair<br/>up to 12 clashing genes, 8 tries each,<br/>keep only if penalty falls"]
  Repair --> Full{"Population full?"}
  Full -->|No| Select
  Full -->|Yes| Eval
```

---

## 3. Class / Module Diagram: `src/ga`

Each proposal step is one module. The modules are plain functions over plain data; only
`Rng` is a class. Nothing in `src/ga` depends on React, so the tests run it directly.

```mermaid
classDiagram
  class CollegeData {
    +Course[] courses
    +Teacher[] teachers
    +Room[] rooms
    +Batch[] batches
  }
  class Problem {
    +CollegeData data
    +Session[] sessions
  }
  class Session {
    +int course
    +int batch
    +int[] teachers
    +int[] rooms
  }
  class Gene {
    +int teacher
    +int room
    +int slot
  }
  class Evaluation {
    +float fitness
    +float penalty
    +int hardViolations
    +float softPenalty
    +int[] conflicted
  }
  class Individual {
    +Gene[] chromosome
    +float fitness
    +int hardViolations
  }
  class Result {
    +Gene[] best
    +float fitness
    +int hardViolations
    +float softPenalty
    +int generations
    +int solvedAt
    +float elapsedMs
  }
  class Rng {
    -int state
    +next() float
    +int(max) int
    +chance(p) boolean
    +pick(items) T
  }

  class problem_ts {
    <<module>>
    +SLOTS = 36
    +buildProblem(data) Problem
  }
  class population_ts {
    <<module>>
    +randomChromosome(problem, rng) Gene[]
    +clone(chromosome) Gene[]
  }
  class fitness_ts {
    <<module>>
    +HARD_PENALTY = 100
    +evaluate(problem, chromosome) Evaluation
  }
  class selection_ts {
    <<module>>
    +tournament(population, k, rng) Individual
  }
  class crossover_ts {
    <<module>>
    +crossover(a, b, rng) Gene[]
  }
  class mutation_ts {
    <<module>>
    +mutate(chromosome, problem, rate, rng) void
  }
  class repair_ts {
    <<module>>
    +repair(chromosome, problem, rng) Evaluation
  }
  class engine_ts {
    <<module>>
    +CONFIG
    +runGA(problem, onProgress, config) Promise~Result~
  }

  Problem "1" --> "1" CollegeData
  Problem "1" --> "*" Session
  Individual "1" --> "*" Gene
  problem_ts ..> Problem : builds
  population_ts ..> Gene : creates
  fitness_ts ..> Evaluation : returns
  repair_ts ..> fitness_ts : uses
  engine_ts ..> population_ts
  engine_ts ..> fitness_ts
  engine_ts ..> selection_ts
  engine_ts ..> crossover_ts
  engine_ts ..> mutation_ts
  engine_ts ..> repair_ts
  engine_ts ..> Rng
  engine_ts ..> Result : returns
```

---

## 4. Component Diagram

Everything runs in the browser. There is no server and no database.

```mermaid
flowchart TB
  subgraph Browser["Browser (served by Vite in development)"]
    subgraph UI["React 18 + TypeScript"]
      App["App.tsx<br/>Generate button, stat tiles"]
      Editor["DataEditor.tsx<br/>edit courses / teachers / rooms / batches<br/>(in memory only)"]
      Chart["Recharts line chart<br/>(hard violations, best fitness)"]
      Grid["Timetable.tsx<br/>HTML table by batch / teacher / room"]
    end
    subgraph Engine["src/ga (no dependencies)"]
      Run["engine.ts runGA()"]
      Ops["problem / population / fitness<br/>selection / crossover / mutation / repair"]
      Rng["rng.ts (seed 42)"]
    end
    Data["data.ts<br/>sample college data"]
  end

  App -->|"initial / reset data"| Data
  Editor -->|"edited CollegeData"| App
  App -->|"buildProblem(data)"| Ops
  App -->|"runGA(problem, onProgress)"| Run
  Run -->|"progress each generation"| Chart
  Run -->|"best chromosome"| Grid
  Run --- Ops
  Run --- Rng
```
