# Defense Preparation

Anticipated examiner questions with prepared answers. Questions are grouped by what the
panel is actually testing. Where an answer references code, the file is named so you can
open it on the spot — that is far more convincing than describing it.

**The single most important rule:** if you do not know, say "I don't know, but here is how
I would find out." A confident wrong answer loses more marks than an honest gap.

---

## A. Why a Genetic Algorithm at all?

### "Why not just use backtracking or a constraint solver?"

Backtracking is complete — it finds a solution if one exists — but its cost explodes. On our
benchmark instance there are 204 sessions, each choosable from roughly 3 teachers × 11 rooms
× 36 slots. The search space is about 10^500 configurations (the benchmark prints this
figure; see `benchmarks/run.ts`, `estimateSearchSpaceLog10`). Backtracking explores that
tree systematically, and a bad choice near the root is only discovered after exploring an
enormous subtree.

A genetic algorithm gives up completeness in exchange for tractability. It cannot prove no
solution exists, but it reaches a conflict-free timetable in under a second. For an
administrator who needs a usable timetable on Sunday morning, that trade is the right one.

### "Why is this problem NP-hard?"

Even and Itai proved in 1976 that the general timetabling problem is NP-complete, by
reduction from graph colouring [reference 1 in the proposal]. The intuition: model each class
session as a vertex, join two vertices whenever they share a teacher, a room or a batch, and
a conflict-free timetable is exactly a proper colouring of that graph where colours are time
slots. Graph colouring is NP-complete, so timetabling is at least as hard.

### "Isn't a GA just random search?"

No, and the distinction is selection. Random search samples independently — each guess is
unrelated to the last. A GA carries information forward: tournament selection biases
reproduction toward better chromosomes, crossover recombines partial solutions that already
work, and elitism guarantees the best solution found is never lost.

The evidence is in the benchmark output. Our best fitness climbs from 0.00009 to conflict-free
in thirteen generations. Random sampling of 1,300 chromosomes (13 generations × 100) from a
10^500 space would find nothing.

---

## B. The fitness function

### "Explain your fitness function."

`Fitness = 1 / (1 + total_penalty)`, exactly as proposal section 4.3.2 Step 3 specifies.
`total_penalty` is a weighted sum of constraint violations. A perfect timetable has zero
penalty and scores exactly 1.0 — there is a test asserting precisely that
(`fitness.test.ts`, "returns exactly 1.0 for a flawless timetable").

Seven hard constraints carry weight 100 each; four soft constraints carry weights between
0.1 and 0.3.

### "Why those particular soft weights? They look arbitrary."

They are not arbitrary, and the story is worth telling because it is a genuine experimental
finding. The first implementation used weights of 3, 2, 2 and 1. The algorithm stalled at six
hard violations and never recovered.

The reason is that a realistic timetable carries around 190 unavoidable soft violations — a
teacher with one idle hour is a normal timetable, not a broken one. At those weights the soft
term was contributing about 40% of the total penalty, so a move that removed a genuine
double-booking could be rejected because it introduced a few idle gaps. The signal was
drowned.

Scaling the soft weights down so their total stays well below the cost of a single hard
violation restores the intended behaviour: eliminate every conflict first, then polish. The
reasoning is recorded in a comment in `packages/shared/src/ga.ts`.

### "You added a constraint that is not in your proposal. Why?"

Yes — batch double-booking. The proposal names three hard constraints: teacher conflict,
room conflict and capacity. A fourth is indispensable: without it the algorithm produces
timetables where one batch of students is scheduled into two rooms at the same time. Those
timetables satisfy the proposal's stated constraints and are still useless.

We chose to implement it and document the addition rather than either omit it or slip it in
silently. It is flagged in the code comment at the top of `fitness.ts` and in the report's
implementation chapter.

### "Your fitness counts a three-way clash as two violations, not three. Is that a bug?"

It is a deliberate consequence of the bucketed counting method, and we tested it. When k
sessions land in the same slot, we count k−1 collisions rather than the k(k−1)/2 pairs a
naive comparison would count. The two agree exactly on whether a violation exists, which is
what determines correctness; they differ only in magnitude when three or more sessions
collide, which is rare and self-correcting. There is a test comparing our counter against a
naive O(n²) recount (`engine.test.ts`, "agrees with an independent recount of violations").

---

## C. The implementation

### "Show me the crossover code."

`server/src/ga/crossover.ts` — about ten lines. A random cut point, genes before it from
parent A, genes after from parent B.

The point worth making: the offspring is **always valid and needs no repair**. That follows
from the encoding. Gene *i* of every chromosome answers the same question — "where does
requirement *i* go?" — so splicing two parents anywhere still yields exactly one placement
per required session. Encodings that store a permutation need a repair operator here.
Ours does not.

### "How do you guarantee a mutation never produces an invalid assignment?"

Each `SessionRequirement` pre-computes three eligible sets: qualified instructors, rooms of
the right type and sufficient capacity, and start slots leaving room for the session's
duration (`context.ts`). Mutation only ever draws from those sets, so it cannot produce an
unqualified teacher or a lab in a lecture hall. There is a property test running 500 rounds
of mutation at rate 1.0 and asserting every gene stays in its eligible set.

### "How do you handle a two-hour laboratory?"

A lab is one gene with `duration = 2`, not two independent genes. Because the placement is a
start slot and a duration, the two periods cannot be separated by crossover or mutation —
contiguity holds by construction rather than by a repair pass. Start slots that would run
past the end of the day are excluded from the eligible set, so a lab can never begin in
period 6. Both properties are tested.

### "Is this really written from scratch?"

Yes. Open `server/package.json`: the dependencies are Express, Prisma, bcrypt, JWT, exceljs,
pdfmake, Zod, cors, helmet and morgan. There is no GA library, no solver, no optimisation
package. Every operator in `server/src/ga/` is our own code, and the directory is small
enough to read aloud.

The one non-obvious inclusion is `rng.ts`, a four-line seedable random generator. We wrote it
rather than using `Math.random()` because reproducible benchmarks require a fixed random
stream — a performance comparison the examiner cannot reproduce proves nothing.

---

## D. Behaviour and robustness

### "What happens if the input data makes a timetable impossible?"

The system detects it before running the algorithm and says exactly what is wrong. This is
NFR4, implemented in `server/src/ga/feasibility.ts`.

This matters because a GA cannot distinguish "no solution exists" from "I haven't found one
yet" — both look like a population that stops improving. Left to itself it would run 1000
generations and report a low fitness score, telling the administrator nothing actionable.
Instead we check necessary conditions up front: are there enough room-periods for the
required sessions, does every course have a qualified teacher, can every batch fit in some
room, is any sole-qualified instructor asked for more hours than they have declared.

**This is worth demonstrating live.** It caught a real bug in our own seed data: we had
capped laboratory capacity at 40 while BBA section A has 55 students, and the checker
refused to run with the message *"No laboratory can seat batch BBA Sem 5A (55 students) for
MGT315. Add a laboratory with capacity of at least 55."* We fixed the data, not the check.

### "What if the algorithm gets stuck in a local optimum?"

It did, and we measured exactly what fixed it. Run `npm run bench:ablation`. The result is
blunt and you should state it before the panel discovers it:

| Variant | Solved | Mean generations | Final hard violations |
|---|:--:|---:|---:|
| Proposal only (Steps 1–7) | **0/5** | — | 6.40 |
| Plus random immigrants | **0/5** | — | 6.40 |
| Plus targeted repair | **5/5** | 13.4 | 0.00 |
| Both (shipped default) | **5/5** | 13.4 | 0.00 |

**The algorithm exactly as specified in our proposal does not solve the benchmark instance.**
It plateaus at around six hard-constraint violations across every seed. Steps 1–7 are a
correct description of a genetic algorithm; they are simply not sufficient for this problem at
this scale. Say this plainly — it is a finding, not a failure, and it is the most interesting
thing the project discovered.

Two refinements were added:

1. **Random immigrants** — after 50 generations without improvement, the weakest individuals
   are replaced with fresh random chromosomes. A converged population has no diversity left
   for crossover to exploit; immigrants reintroduce it. Elites are never displaced.
2. **Targeted repair** (`repair.ts`) — the fitness evaluator already knows which genes
   collided while counting violations, so this operator asks it and tries a bounded number of
   alternative placements for those specific genes, keeping a change only if the penalty
   falls. It is a strict improvement filter and cannot make a chromosome worse.

The hybrid of a GA with local search is known in the literature as a **memetic algorithm**.

Be ready for the follow-up: **only repair actually matters.** Random immigrants contribute
nothing measurable — 0/5 without repair, and no gain in generations or time alongside it. The
two operators address different failure modes: immigrants restore population *diversity*,
repair supplies *directed* change. The measurements say the binding problem here was blind
mutation, not lost diversity. We kept immigrants in the default because they cost nothing
(789 ms against 787 ms) and insure against a different failure mode on other datasets — but
that is a judgement, not a result, and we say so in the report.

### "Your algorithm never reaches fitness 1.0. Isn't that a failure?"

This is the sharpest question the panel can ask, and the answer is that the proposal contains
an ambiguity we had to resolve.

Section 4.3.2 Step 7 says the loop runs "until a chromosome achieves a fitness score of 1.0".
Taken literally that can never fire on real data: fitness is 1/(1+penalty) and penalty
includes soft constraints, of which any realistic timetable has a few. Waiting for exactly
1.0 would mean always running all 1000 generations.

But Expected Outcome 2 of the same proposal writes "a fitness score of 1.0 **(zero hard
constraint violations)**" — equating the two. That is the intent, so the implementation stops
once zero hard violations has been reached *and* the soft score has stopped improving. The
literal 1.0 test is retained as well, and there is a test proving it fires on a dataset that
admits a flawless timetable.

We report **time to the first conflict-free timetable** as the headline metric, because that
is the moment the administrator has something usable.

### "Is the result reproducible?"

Completely. Every run is driven by a seeded generator, and the seed is stored with the run in
the database. Give the same seed and parameters and you get a byte-identical timetable —
there is a test asserting exactly that. You can pick any run on the Analysis screen, read off
its seed, and re-run it.

---

## E. Engineering and architecture

### "How is access control enforced?"

By Express middleware (`requireRole` in `server/src/middleware/auth.ts`), applied to every
mutating route. The React app also hides controls a viewer cannot use, but that is a courtesy
to the user, not a security boundary — anyone can issue a DELETE with curl. There are
integration tests that sign in as a viewer and assert 403 on create, update, delete and
generate.

### "Why is validation duplicated on the client and the server?"

It is not duplicated — it is defined once. `packages/shared/src/schemas.ts` holds the Zod
schemas, and both the React forms and the Express middleware import the same objects. That is
also the concrete justification for the proposal's claim (section 4.2.1) that Node.js was
chosen so frontend and backend could share TypeScript definitions.

### "How does the live progress chart work if Node.js is single-threaded?"

This is a real problem and we solved it deliberately. The evolutionary loop is CPU-bound and
synchronous; run straight through it would occupy the process for the entire computation, and
every progress event would arrive in one burst after the search had already finished — the
chart would be a replay pretending to be live.

The loop is therefore written as a **generator** that yields once per generation
(`engine.ts`, the private `steps` method). `run()` drains it synchronously for the CLI and the
tests; `runAsync()` drains it while returning control to the event loop every few
generations, so Express can flush each event over the SSE connection. There is exactly one
implementation of Steps 2–7, so the two paths cannot diverge.

### "Why server-sent events rather than WebSockets?"

The traffic is strictly one-directional — server to browser. SSE needs no additional
dependency, no protocol upgrade, and the browser reconnects automatically. WebSockets would
add a library and bidirectional machinery we have no use for.

### "How did you make the fitness function fast enough?"

By bucketing rather than pairwise comparison. The obvious implementation compares every gene
with every other to find clashes — at our scale that is roughly 200² × 100 population × 1000
generations, about four billion comparisons, far beyond the 120-second budget.

Instead each (resource, slot) pair indexes into a counter array, and a clash is recorded when
a bucket that is already occupied is entered. Each gene is touched once, so a full evaluation
is linear in the number of scheduled periods. The buffers are allocated once and cleared in
O(1) with a generation-stamp trick, which avoids creating 100,000 large arrays per benchmark
run and drowning the process in garbage collection.

---

## F. Testing and evidence

### "How do you know the generated timetable is actually conflict-free?"

Three independent layers, deliberately not trusting each other:

1. **Unit tests** construct chromosomes with each specific violation and assert the evaluator
   detects it.
2. **A property-based test** runs 25 independent searches across different seeds and
   instances, and for every run that reports success, re-checks the *decoded output* directly
   for double-bookings, capacity overflows and unqualified teachers. This does not trust the
   fitness counter, so a bug in the counter cannot hide a bug in the schedule.
3. **An integration test** runs the real HTTP endpoint against the real database and re-checks
   the persisted assignments the same way.

### "What is your test coverage?"

65 tests: 43 on the algorithm, 22 on the API. The concentration is deliberate — the GA is the
graded contribution, so it carries the heaviest testing.

### "Can you prove your performance numbers?"

Run `npm run bench:nfr1` in front of us. It executes ten seeded runs of the NFR1
configuration and prints a PASS/FAIL against both the 120-second budget and the 500-generation
target, writing the raw data to CSV. Everything in the Result Analysis chapter comes from
those files.

---

## G. Limitations — state these before you are asked

Volunteering limitations reads as command of the material. Being caught hiding one does not.

1. **No completeness guarantee.** The GA cannot prove a timetable is impossible; the
   feasibility checker catches only the necessary conditions we implemented, not every case.
2. **Consecutive-lab modelling is fixed at two periods.** A three-hour laboratory would need
   the duration to be configurable per course, which the encoding supports but the UI does not
   yet expose.
3. **Soft-constraint weights are hand-tuned.** They were chosen empirically, as the sweep
   documents, not derived from any principle. Different institutions would likely want
   different weights, which should be configurable.
4. **Single-institution scope.** There is no multi-tenancy; one deployment serves one college.
5. **The mutation rate default is inherited from the proposal, not from our own data.** Our
   parameter sweep found 0.01 converges faster and produces better soft scores than the
   specified 0.05. We kept 0.05 as the shipped default so the running system matches the
   proposal, and report the better value as a finding.
6. **A scalability ceiling.** Our stress instance — 600 sessions across 30 batches, roughly
   three times the benchmark configuration — did **not** converge in 600 generations, in any
   of three runs. The instance is feasible in principle. This is well beyond the scale NFR1
   specifies and larger than any single TU-affiliated college would schedule as one unit, but
   it is a real ceiling and we report it as measured. Greedy population seeding and parallel
   fitness evaluation are the two changes most likely to raise it.
7. **No mid-semester rescheduling.** Regenerating produces a fresh timetable rather than
   minimally perturbing the existing one — the more useful behaviour when a single teacher
   becomes unavailable in week 8. This is the most valuable direction for future work.

---

## H. If something breaks during the demo

- **The API is not responding** — `npm run db:up` then `npm run -w server dev`. Check
  `http://localhost:4000/api/health`.
- **The database is empty or corrupted** — `npm run seed` restores the exact benchmark
  dataset in a few seconds.
- **A generation run misbehaves live** — there are completed runs stored in the database.
  Open the Analysis screen, select any earlier run, and show its convergence curve. The
  timetable screen always displays the most recent completed run.
- **Everything is broken** — fall back to `npm run ga:cli`, which runs the whole algorithm in
  the terminal with no browser, no database writes and no HTTP layer.
