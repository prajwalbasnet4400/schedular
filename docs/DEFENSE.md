# Defense Preparation

Anticipated examiner questions with prepared answers. Questions are grouped by what the
panel is actually testing. Where an answer references code, the file and line are named so
you can open it on the spot. That is far more convincing than describing it.

**The single most important rule:** if you do not know, say "I don't know, but here is how
I would find out." A confident wrong answer loses more marks than an honest gap.

---

## A. Why a Genetic Algorithm at all?

### "Why not just use backtracking or a constraint solver?"

Backtracking is complete (it finds a solution if one exists), but its cost explodes. Our
data has 180 sessions, each choosable from about 3 qualified teachers × up to 15 rooms × 36
slots. Multiplying the choices per session gives roughly 10^523 possible timetables.
Backtracking explores that tree systematically, and a bad choice near the root is only
discovered after exploring an enormous subtree.

A genetic algorithm gives up completeness in exchange for tractability. It cannot prove no
solution exists, but on our data it reaches a clash-free timetable in about seven
generations and under half a second. For an administrator who needs a usable timetable,
that trade is the right one.

### "Why is this problem NP-hard?"

Even and Itai proved in 1976 that the general timetabling problem is NP-complete, by
reduction from graph colouring [reference 1 in the proposal]. The intuition: make each class
session a vertex, join two vertices whenever they share a teacher, a room or a batch, and a
clash-free timetable is exactly a proper colouring of that graph where the colours are time
slots. Graph colouring is NP-complete, so timetabling is at least as hard.

### "Isn't a GA just random search?"

No, and the difference is selection. Random search samples independently: each guess is
unrelated to the last. A GA carries information forward. Tournament selection biases
reproduction toward better chromosomes, crossover recombines partial solutions that already
work, and elitism guarantees the best solution found is never lost.

The evidence: the default run starts at 50 hard violations and reaches zero at generation
7. That is 700 chromosomes out of a 10^523 space. Random sampling would find nothing.

---

## B. The fitness function

### "Explain your fitness function."

`Fitness = 1 / (1 + total_penalty)`, exactly as proposal section 4.3.2 Step 3 specifies
(`src/ga/fitness.ts:71`). `total_penalty` is a weighted sum of violations
(`fitness.ts:68`).

- **Hard, weight 100 each** (`fitness.ts:25`): teacher clash, room clash, batch clash.
- **Soft**: teacher idle gaps at 0.3 and uneven daily spread per batch at 0.2
  (`fitness.ts:26-27`).

The other two hard constraints, teacher qualification and room capacity, are not in the
fitness function at all. They are enforced by construction (see section C), so they can
never be violated.

### "Why those particular soft weights? They look arbitrary."

They are chosen so that all soft penalty together stays below the cost of one hard
violation. A realistic timetable always has some idle gaps and some unevenness; our final
timetables carry a soft penalty of about 8 to 10. If the soft weights were large, a move
that removed a genuine double-booking could be rejected because it added a few idle gaps.
Keeping soft < 100 means the algorithm always fixes clashes first, then polishes. The
reasoning is written in the comment at `fitness.ts:15-16`.

That is a design rule, not a derivation. The exact values 0.3 and 0.2 are hand-picked
within it, and we say so in the limitations.

### "You added a constraint that is not in your proposal. Why?"

Yes: batch clash. The proposal names teacher conflict, room conflict and capacity. Without a
batch constraint the algorithm happily produces timetables where one group of students is
scheduled into two rooms at the same time. Those timetables satisfy the proposal's stated
constraints and are still useless.

We implemented it and documented the addition rather than omit it or slip it in silently.
It is one line (`fitness.ts:61`) and is listed in the header comment.

### "Your fitness counts a three-way clash as two violations, not three. Is that a bug?"

It is a consequence of the counting method. Each (teacher, slot), (room, slot) and (batch,
slot) cell remembers the first gene that took it; every later gene landing there is one
violation (`fitness.ts:46-55`). So k sessions in one cell count k−1, not the k(k−1)/2 pairs
a naive comparison gives. The two agree exactly on whether a clash exists, which is what
matters for correctness; they differ only in size when three or more collide, which is
rare and still penalised. We do not have a separate test comparing against a pairwise
recount; the clash tests in `ga.test.ts` cover the two-gene case.

### "How is the fitness function fast enough?"

It is linear, not quadratic. Comparing every gene with every other would be 180² per
evaluation. Instead each gene claims three cells in flat `Int32Array`s (`fitness.ts:40-42`),
so a full evaluation touches each gene once, plus a fixed scan of the grid for the soft
constraints.

---

## C. The implementation

### "What is a gene?"

`{ teacher, room, slot }` (`src/ga/problem.ts:27-31`). The list of sessions is fixed when the
problem is built (a course with 3 lectures a week becomes 3 sessions), so gene *i* always
describes session *i*. Course and batch never change, so the gene does not store them.

### "How do you guarantee no gene has an unqualified teacher or a room that is too small?"

By construction. When the problem is built, each session gets a list of qualified teachers
and a list of rooms big enough for its batch (`problem.ts:46-47`). The initial population
(`population.ts:11-15`), mutation (`mutation.ts:15-16`) and repair (`repair.ts:32-34`) only
ever draw from those lists. There is a test asserting every session's lists are valid, and
one running mutation at rate 1.0 and checking every room stays in the allowed list.

If the data makes that impossible (a course nobody can teach, a batch no room can seat),
building the problem throws a plain error naming it (`problem.ts:49-50`).

### "Show me the crossover code."

`src/ga/crossover.ts`, three lines of logic. A random cut point; genes before it from parent
A, genes after from parent B.

The point worth making: the child is **always a complete, valid timetable**. Gene *i* of
every chromosome answers the same question ("where does session *i* go?"), so splicing two
parents anywhere still gives exactly one placement per session. Encodings that store a
permutation need a repair step here. Ours does not. There is a test checking every child
gene came from one of its parents.

### "How does mutation work?"

Per-gene rate 0.05 (`engine.ts:26`). A mutated gene gets a new room, a new slot, or both,
chosen with equal probability (`mutation.ts:14-16`). Mutation does not change the teacher. A
session's teacher is picked at random in the first population and afterwards only changed
by repair; crossover passes whole genes on unchanged.

### "What are the parameters, and where do they come from?"

All from the proposal, in one place (`engine.ts:22-32`): population 100, max 1000
generations, crossover 0.8, mutation 0.05, tournament k = 5, elitism 20%. The only one we
added is patience 20 (see termination below).

### "Is this really written from scratch?"

Yes. Open `package.json`: the runtime dependencies are React, React DOM and Recharts. There
is no GA library, no solver, no optimisation package. Every operator in `src/ga/` is our own
code, one file per proposal step, and the whole directory is small enough to read aloud.

`rng.ts` is a seeded random generator (mulberry32). We wrote it rather than use
`Math.random()` so every run is reproducible.

### "How does the chart update live if JavaScript is single-threaded?"

The loop yields to the browser once per generation with `await new Promise(r =>
setTimeout(r, 0))` (`engine.ts:121`). React gets a chance to redraw the chart between
generations. Without it, the page would freeze and the chart would appear all at once at
the end.

---

## D. Behaviour and robustness

### "What if the algorithm gets stuck in a local optimum?"

It does, without help, and we measured it. We ran 10 seeds (1–10) with and without our
targeted repair step:

| Variant | First clash-free generation (mean) | Range | Missed 500-gen target | Final soft penalty |
|---|---:|---:|:--:|---:|
| Proposal only (Steps 1–7) | 378.8 | 286–572 | 2 / 10 | 27.3–35.9 |
| Plus targeted repair (shipped) | 7.1 | worst 8 | 0 / 10 | 8.0–9.6 |

**The algorithm exactly as the proposal specifies does get there, but slowly: about 380
generations on average, and two seeds out of ten miss the proposal's 500-generation
target.** The reason is that once the population becomes similar, crossover makes
near-copies, and random mutation rarely hits the handful of genes that are actually
clashing.

**Targeted repair** (`src/ga/repair.ts`) fixes this. The fitness function already records
which genes clash (`fitness.ts:52-53`). Repair takes up to 12 of them, tries 8 random new
placements for each, and keeps a change only if the total penalty falls (`repair.ts:37`).
It cannot make a chromosome worse. The result is about 50× fewer generations.

A GA combined with local search like this is known in the literature as a **memetic
algorithm**. Say plainly that repair is our addition, not part of the proposal; it is
labelled as such at the top of `repair.ts`.

(To reproduce the "without repair" row: replace the `repair(...)` call at `engine.ts:115`
with a plain `evaluate(problem, child)` and run the seeds.)

### "Your algorithm never reaches fitness 1.0. Isn't that a failure?"

This is the sharpest question the panel can ask. The answer is that the proposal contains
an ambiguity we had to resolve.

Section 4.3.2 Step 7 says the loop runs "until a chromosome achieves a fitness score of
1.0". Taken literally that almost never fires: fitness is 1/(1+penalty), and any realistic
timetable has some soft penalty (a teacher with one free hour). Our runs end at fitness
about 0.09–0.11, which is soft penalty around 8–10 and **zero hard violations**.

Expected Outcome 2 of the same proposal writes "a fitness score of 1.0 **(zero hard
constraint violations)**", equating the two. That is the intent. So the loop stops when
(`engine.ts:101-102`):

1. fitness is exactly 1.0 (kept from the proposal), or
2. the best timetable is clash-free **and** fitness has not improved for 20 generations, or
3. 1000 generations are reached.

We report **the generation of the first clash-free timetable** as the headline number,
because that is the moment the administrator has something usable.

### "What are your results?"

On the fixed data, 10 seeds:

- First clash-free timetable at generation 7.1 on average (worst 8), in about 384 ms (worst
  442 ms). NFR1 allows 120 seconds and 500 generations.
- Starting point: 58–65 hard violations in the best random chromosome.
- Full run including soft polishing: 74–160 generations, 3.3–6.8 s.

The demo uses seed 42: 50 hard violations at generation 1, clash-free at generation 7
(about 0.4 s), stops at generation 61 (about 2.5 s), fitness 0.0877.

### "Is the result reproducible?"

Yes. The seed is fixed at 42 (`engine.ts:31`) and every random choice goes through `Rng`.
Press Generate twice, or reload the page, and you get the same generations, the same
fitness and the same timetable. Only the elapsed time differs slightly.

---

## E. Scope: what the proposal promised and we did not build

**Volunteer this before it is asked.** Being caught hiding it is far worse than stating it.

### "Your proposal promised CRUD screens, PDF/Excel export, login with roles, PostgreSQL, Express and AG-Grid. Where are they?"

> "We made a deliberate scope decision. The graded contribution of this project is the
> genetic algorithm, so we cut the system down to exactly what demonstrates it: the data,
> the seven steps, the live chart and the timetable. Everything else is standard web
> plumbing that would add a lot of code to explain and nothing to the algorithm."

Then state the status honestly:

| Requirement | Status |
|---|---|
| FR1 Manage data (CRUD) | **Not implemented.** Data is fixed in `src/data.ts`. |
| FR2 Generate timetable with GA | Done. |
| FR3 View timetable | Partial: by batch, teacher or room; plain HTML table, no AG-Grid, no filtering. |
| FR4 Show progress / performance | Done: live chart and stat tiles. |
| FR5 Export PDF / Excel | **Not implemented.** |
| FR6 Login with roles | **Not implemented.** No backend, so nothing to protect. |
| NFR1 Performance (120 s, 500 generations) | Met: ~0.4 s, ~7 generations; a test checks it. |
| NFR2 Usability | Met: one page, one button. |
| NFR3 Data integrity (PostgreSQL) | **No database.** |
| NFR4 Robustness | Partial: a plain error if a course has no teacher or a batch fits no room; no full feasibility check. |

If pressed on "why not keep them anyway": every one of those features is independent of the
algorithm. Adding them back changes nothing in `src/ga/`, because the GA takes plain data in
and returns a chromosome.

---

## F. Testing and evidence

### "How do you know the generated timetable is actually clash-free?"

Two ways:

1. **Tests** (`src/ga/ga.test.ts`, 8 tests, `npm test`): encoding produces 180 sessions with
   valid teacher and room lists; the fitness function detects a teacher clash (and flags both
   genes) and a room clash; crossover and mutation keep genes valid; and a full GA run
   reaches zero hard violations within 500 generations and 120 seconds.
2. **Look at it.** The timetable view places every session of the selected batch, teacher or
   room into its slot. A clash would show as two cards stacked in one cell. Flick through the
   batch, teacher and room views and there are none.

Be honest that there is no independent re-check of the decoded output separate from the
fitness counter; the stacked-card view is the independent check.

### "Why so few tests?"

Because the code is small. The tests target the properties the algorithm depends on:
encoding, constraint detection, operator validity, and the NFR1 result.

---

## G. Limitations: state these before you are asked

1. **Scope.** No data entry, export, login or database (section E).
2. **No completeness guarantee.** The GA cannot prove a timetable is impossible, and the
   only input checks are "every course has a teacher" and "every batch fits some room".
3. **Simplified model.** Every course is 3 one-hour lectures a week. No labs or consecutive
   periods, no room types, no teacher availability.
4. **Soft weights are hand-picked.** 0.3 and 0.2 follow the "soft < one hard" rule, but the
   exact values are not derived from anything, and a real college would want to set them.
5. **Repair is not in the proposal.** Without it the plain GA takes about 380 generations
   and misses the 500-generation target on 2 of 10 seeds. We report that as a finding.
6. **Fixed data, one scale.** Results are measured on one dataset (180 sessions). We have not
   measured how it behaves on a much larger college.
7. **No rescheduling.** Regenerating produces a fresh timetable rather than minimally
   changing the existing one, which is what an administrator wants when one teacher becomes
   unavailable mid-semester. This is the most useful direction for future work.

---

## H. If something breaks during the demo

- **The page is in a strange state** — reload it. There is nothing stored; the seed is fixed,
  so the next run is identical.
- **The dev server is not running** — `npm run dev`, then open `http://localhost:5173`.
- **Dependencies missing** — `npm install`, then `npm run dev`.
- **The browser is broken** — run `npm test`. The last test runs the full GA in the terminal
  and passes only if it finds a clash-free timetable.
