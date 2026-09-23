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
sample data has 48 sessions, each choosable from its qualified teachers × up to 3 rooms × 36
slots. Multiplying the choices per session gives roughly 10^95 possible timetables.
Backtracking explores that tree systematically, and a bad choice near the root is only
discovered after exploring an enormous subtree.

A genetic algorithm gives up completeness in exchange for tractability. It cannot prove no
solution exists, but on our data it reaches a clash-free timetable in about two
generations and a few tens of milliseconds, and a perfect fitness of 1.0 in under half a
second. For an administrator who needs a usable timetable,
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

The evidence: the default run starts at 12 hard violations and reaches zero at generation
2, about 200 chromosomes out of a 10^95 space, then fitness 1.0 at generation 38. Random sampling would find nothing.

---

## B. The fitness function

### "Explain your fitness function."

`Fitness = 1 / (1 + total_penalty)`, exactly as proposal section 4.3.2 Step 3 specifies
(`src/ga/fitness.ts:89`). `total_penalty` is a weighted sum of violations
(`fitness.ts:86`).

- **Hard, weight 100 each** (`fitness.ts:29`): teacher clash, room clash, batch clash.
- **Soft**: teacher idle gaps at 0.3 and uneven daily spread per batch at 0.2
  (`fitness.ts:31-33`).

The other two hard constraints, teacher qualification and room capacity, are not in the
fitness function at all. They are enforced by construction (see section C), so they can
never be violated.

### "Why those particular soft weights? They look arbitrary."

They are chosen so that all soft penalty together stays below the cost of one hard
violation. On the small sample data the algorithm (with repair) removes soft penalty
completely; on bigger or tighter data some idle gaps and unevenness would remain. If the soft
weights were large, a move
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
It is one line (`fitness.ts:78`) and is listed in the header comment.

### "Your fitness counts a three-way clash as two violations, not three. Is that a bug?"

It is a consequence of the counting method. Each (teacher, slot), (room, slot) and (batch,
slot) cell remembers the first gene that took it; every later gene landing there is one
violation (`fitness.ts:61-70`). So k sessions in one cell count k−1, not the k(k−1)/2 pairs
a naive comparison gives. The two agree exactly on whether a clash exists, which is what
matters for correctness; they differ only in size when three or more collide, which is
rare and still penalised. We do not have a separate test comparing against a pairwise
recount; the clash tests in `ga.test.ts` cover the two-gene case.

### "How is the fitness function fast enough?"

It is linear, not quadratic. Comparing every gene with every other would be quadratic per
evaluation (48² on the sample, far more on a real college). Instead each gene claims three cells in flat `Int32Array`s (`fitness.ts:54-56`),
so a full evaluation touches each gene once, plus a fixed scan of the grid for the soft
constraints.

---

## C. The implementation

### "What is a gene?"

`{ teacher, room, slot }` (`src/ga/problem.ts:42-46`). The list of sessions is fixed when the
problem is built (a course with 3 lectures a week becomes 3 sessions), so gene *i* always
describes session *i*. Course and batch never change, so the gene does not store them.

### "How do you guarantee no gene has an unqualified teacher or a room that is too small?"

By construction. When the problem is built, each session gets a list of qualified teachers
and a list of rooms big enough for its batch (`problem.ts:80-81`). The initial population
(`population.ts:13-17`), mutation (`mutation.ts:19-20`) and repair (`repair.ts:38-40`) only
ever draw from those lists. There is a test asserting every session's lists are valid, and
one running mutation at rate 1.0 and checking every room stays in the allowed list.

If the data makes that impossible (a course nobody can teach, a batch no room can seat),
building the problem throws a plain error naming it (`problem.ts:84-85`). It also rejects a
duplicate course code and a teacher or batch listing an unknown course (`problem.ts:64-70`).
The page shows the message and disables Generate.

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
chosen with equal probability (`mutation.ts:18-20`). Mutation does not change the teacher. A
session's teacher is picked at random in the first population and afterwards only changed
by repair; crossover passes whole genes on unchanged.

### "What are the parameters, and where do they come from?"

All from the proposal, in one place (`engine.ts:22-32`): population 100, max 1000
generations, crossover 0.8, mutation 0.05, tournament k = 5, elitism 20%. The only one we
added is patience 20, a fallback stop (see termination below).
They are the defaults: every one of them, including the seed, can be edited on the page
before pressing Generate, and "Reset to proposal defaults" puts them back.

### "Is this really written from scratch?"

Yes. Open `package.json`: the runtime dependencies are React, React DOM and Recharts. There
is no GA library, no solver, no optimisation package. Every operator in `src/ga/` is our own
code, one file per proposal step, and the whole directory is small enough to read aloud.

`rng.ts` is a seeded random generator (mulberry32). We wrote it rather than use
`Math.random()` so every run is reproducible.

### "How does the chart update live if JavaScript is single-threaded?"

The loop yields to the browser once per generation with `await new Promise(r =>
setTimeout(r, 0))` (`engine.ts:136`). React gets a chance to redraw the chart between
generations. Without it, the page would freeze and the chart would appear all at once at
the end.

---

## D. Behaviour and robustness

### "What if the algorithm gets stuck in a local optimum?"

It does, without help, and we measured it. We ran 10 seeds (1–10) with and without our
targeted repair step:

| Variant | First clash-free generation (mean) | Range | Reached fitness 1.0 | Final soft penalty |
|---|---:|---:|:--:|---:|
| Proposal only (Steps 1–7) | 16.2 | 11–22 | 2 / 10 | 0–1.4 (fitness 0.42–0.77 when not 1.0) |
| Plus targeted repair (shipped) | 2.2 | worst 3 | 10 / 10 | 0 |

**The algorithm exactly as the proposal specifies does become clash-free, but takes about
7× as many generations, and on eight seeds out of ten it stalls short of fitness 1.0.** The reason is that once the population becomes similar, crossover makes
near-copies, and random mutation rarely hits the handful of genes that are actually
clashing.

**Targeted repair** (`src/ga/repair.ts`) fixes this. The fitness function already records
which genes clash (`fitness.ts:67-68`). Repair takes up to 12 of them, tries 8 random new
placements for each, and keeps a change only if the total penalty falls (`repair.ts:44`).
It cannot make a chromosome worse. The result is about 7× fewer generations to clash-free,
and on this data it is what lets every run reach a perfect 1.0.

A GA combined with local search like this is known in the literature as a **memetic
algorithm**. Say plainly that repair is our addition, not part of the proposal; it is
labelled as such at the top of `repair.ts`.

(To reproduce the "without repair" row: replace the `repair(...)` call at `engine.ts:129`
with a plain `evaluate(problem, child)` and run the seeds.)

### "Does it actually reach the fitness 1.0 your proposal promised?"

Yes, on the sample data. Section 4.3.2 Step 7 says the loop runs "until a chromosome
achieves a fitness score of 1.0", and Expected Outcome 2 asks for fitness 1.0 within 500
generations. With repair, all 10 seeds reach fitness exactly 1.0 (zero hard and zero soft
penalty) after 18–47 generations, so the loop stops on that literal condition. The demo seed
42 gets there at generation 38.

The loop stops when (`engine.ts:108-109`):

1. fitness is exactly 1.0 (the proposal's condition, which is what fires on the sample), or
2. the best timetable is clash-free **and** fitness has not improved for 20 generations, or
3. 1000 generations are reached.

Rule 2 is a fallback for bigger or tighter data, where some soft penalty (a teacher with one
free hour) cannot be removed and 1.0 is out of reach. We also report **the generation of the
first clash-free timetable**, because that is the moment the administrator has something
usable.

### "Isn't this dataset too small to be interesting?"

It is kept small so the demo is quick to explain. Even so, a random start has 10–14 clashes
and the search space is about 10^95. The plain GA still needs 11–22 generations to become
clash-free and usually cannot reach 1.0. The NFR1-sized dataset (6 programmes, 30 courses,
20 teachers, 15 rooms, 180 sessions; the earlier `src/data.ts`, still in git at commit
`4a72724`) was measured separately: clash-free in 384 ms mean and 442 ms worst over 10 seeds.
A dataset that size can be entered through **Edit college data**.

### "What are your results?"

On the sample data, 10 seeds:

- First clash-free timetable at generation 2.2 on average (worst 3), in about 26 ms (worst
  38 ms). The proposal allows 120 seconds and 500 generations.
- Starting point: 10–14 hard violations in the best random chromosome.
- Every run reaches fitness exactly 1.0 and stops there: 18–47 generations, 138–327 ms.

The demo uses seed 42: 12 hard violations at generation 1, clash-free at generation 2
(about 28 ms), fitness 1.0000 and stop at generation 38 (about 0.3–0.4 s).

NFR1 names a larger college, so the default demo does not show it directly; it was measured
on the earlier 180-session sample (see "too small" above).

### "Is the result reproducible?"

Yes. The default seed is 42 (`engine.ts:31`) and every random choice goes through `Rng`.
With the same parameters, press Generate twice, or reload the page, and you get the same generations, the same
fitness and the same timetable. Only the elapsed time differs slightly.

---

## E. Scope: what the proposal promised and we did not build

**Volunteer this before it is asked.** Being caught hiding it is far worse than stating it.

### "Your proposal promised CRUD screens, PDF/Excel export, login with roles, PostgreSQL, Express and AG-Grid. Where are they?"

> "We made a deliberate scope decision. The graded contribution of this project is the
> genetic algorithm, so we cut the system down to exactly what demonstrates it: the data,
> the seven steps, the live chart and the timetable. You can edit courses, teachers, rooms
> and batches on the page, but the edits are not saved, because there is no database.
> Everything else is standard web plumbing that would add a lot of code to explain and
> nothing to the algorithm."

Then state the status honestly:

| Requirement | Status |
|---|---|
| FR1 Manage data (CRUD) | **Partial.** Courses, teachers, rooms and batches can be edited, added and removed in the browser ("Edit college data"). Not saved (no database; a reload restores the sample in `src/data.ts`). No departments, time slots, availability or login. |
| FR2 Generate timetable with GA | Done. |
| FR3 View timetable | Partial: by batch, teacher or room; plain HTML table, no AG-Grid, no filtering. |
| FR4 Show progress / performance | Done: live chart and stat tiles. |
| FR5 Export PDF / Excel | **Not implemented.** |
| FR6 Login with roles | **Not implemented.** No backend, so nothing to protect. |
| NFR1 Performance (120 s, 500 generations) | Met (measured on the earlier 180-session dataset): clash-free in 384 ms mean, 442 ms worst over 10 seeds. The current sample is smaller (48 sessions, ~0.3 s to fitness 1.0); a test checks the 500-generation / 120 s budget on it. |
| NFR2 Usability | Met: one page, one button. |
| NFR3 Data integrity (PostgreSQL) | **No database.** |
| NFR4 Robustness | Partial: a plain error, and Generate disabled, for a duplicate course code, a teacher or batch listing an unknown course, a course with no teacher, or a batch that fits no room; no full feasibility check. |

If pressed on "why not keep them anyway": every one of those features is independent of the
algorithm. Adding them back changes nothing in `src/ga/`, because the GA takes plain data in
and returns a chromosome.

---

## F. Testing and evidence

### "How do you know the generated timetable is actually clash-free?"

Two ways:

1. **Tests** (`src/ga/ga.test.ts`, 10 tests, `npm test`): encoding produces 48 sessions with
   valid teacher and room lists, and rejects an unknown or duplicate course code; the fitness function detects a teacher clash (and flags both
   genes) and a room clash; crossover and mutation keep genes valid; and a full GA run
   reaches zero hard violations within 500 generations and 120 seconds.
2. **Look at it.** The timetable view places every session of the selected batch, teacher or
   room into its slot. A clash would show as two cards stacked in one cell. Flick through the
   batch, teacher and room views and there are none.

Be honest that there is no independent re-check of the decoded output separate from the
fitness counter; the stacked-card view is the independent check.

### "Why so few tests?"

Because the code is small. The tests target the properties the algorithm depends on:
encoding (including rejecting bad data), constraint detection, operator validity, and the
NFR1 result.

---

## G. Limitations: state these before you are asked

1. **Scope.** Data can be edited in the browser but is not saved; no export, login or
   database (section E).
2. **No completeness guarantee.** The GA cannot prove a timetable is impossible, and the
   only input checks are unique course codes, no unknown course codes, "every course has a
   teacher" and "every batch fits some room".
3. **Simplified model.** Every course is 3 one-hour lectures a week. No labs or consecutive
   periods, no room types, no teacher availability.
4. **Soft weights are hand-picked.** 0.3 and 0.2 follow the "soft < one hard" rule, but the
   exact values are not derived from anything, and a real college would want to set them.
5. **Repair is not in the proposal.** Without it the plain GA takes about 16 generations to
   become clash-free and reaches fitness 1.0 on only 2 of 10 seeds. We report that as a finding.
6. **Two scales, no more.** Results are measured on the small sample (48 sessions) and, for
   NFR1, on the earlier 180-session dataset. We have not measured how it behaves on a much
   larger college.
7. **No rescheduling.** Regenerating produces a fresh timetable rather than minimally
   changing the existing one, which is what an administrator wants when one teacher becomes
   unavailable mid-semester. This is the most useful direction for future work.

---

## H. If something breaks during the demo

- **The page is in a strange state** — reload it. There is nothing stored (data edits are
  lost too); the seed is fixed, so the next run is identical.
- **The dev server is not running** — `npm run dev`, then open `http://localhost:5173`.
- **Dependencies missing** — `npm install`, then `npm run dev`.
- **The browser is broken** — run `npm test`. The last test runs the full GA in the terminal
  and passes only if it finds a clash-free timetable.
