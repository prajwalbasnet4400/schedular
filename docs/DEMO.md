# Live Demonstration Script

A rehearsed twelve-minute path through the system. Timings assume a panel that interrupts;
if they don't, you will finish early, which is fine.

**Rehearse this end to end at least twice on the machine you will present from.**

---

## Before the panel arrives

```bash
cd schedular
npm run db:up                    # PostgreSQL container
npm run seed                     # restore the exact benchmark dataset
npm run dev                      # API on :4000, client on :5173
```

Then, in the browser:

1. Open `http://localhost:5173`, sign in as **admin@academia.edu.np / admin123**.
2. **Generate one timetable now and let it finish.** This guarantees the Timetable and
   Analysis screens have something to show even if the live run misbehaves later.
3. Sign out, so you can demonstrate the login.
4. Have a second browser tab open on `docs/UML.md` rendered, and an editor open on
   `server/src/ga/`.
5. Close everything else. Silence notifications.

**Checklist:** `curl localhost:4000/api/health` returns ok · the seed reports 30 courses,
20 instructors, 15 rooms · one completed run already exists.

---

## 1. Frame the problem (1 min) — no screen

> "Scheduling a college timetable is NP-hard. At Academia International College, a committee
> spends two to three weeks each semester building the timetable in Excel, and it still ships
> with clashes. Our system takes the same data they already collect and produces a
> conflict-free timetable in under a second."

Do not open anything yet. Let the claim land, then prove it.

---

## 2. Sign in and show the data (1.5 min)

Sign in as the administrator. On the dashboard, point at the counts: **30 courses, 20
instructors, 15 rooms, 12 batches, 36 time slots.**

> "This is exactly the configuration our proposal names in NFR1 — six programmes, thirty
> courses, twenty teachers, fifteen rooms — so every number we quote today is measured on the
> data you are looking at."

Open **Instructors**, click **Edit** on any instructor, and scroll to the availability matrix.

> "Two hard constraints live here. An instructor can only teach subjects they are qualified
> for, and only in periods they have declared themselves available. Notice this instructor is
> unavailable all day Friday — the algorithm will respect that."

---

## 3. Feasibility check (1 min) — *the question the panel will ask anyway*

Go to **Generate**. Point at the statistics strip.

> "Before running anything, the system checks whether the data can produce a timetable at
> all. 204 sessions to place into 540 room-periods, 41.5% utilisation — feasible."

> "This matters because a genetic algorithm can't tell 'no solution exists' from 'I haven't
> found one yet'. Both look like a population that stops improving. Without this check the
> administrator would wait for a thousand generations and get a bad score with no explanation
> of what to fix."

**Optional, if you have the nerve and the time** — it is the strongest single moment
available. In another tab, edit any laboratory's capacity down to 20, return, click
**Re-check data**:

> "It now refuses to run, and tells the administrator exactly which record to fix rather
> than failing silently."

Restore the capacity before continuing.

---

## 4. Generate, live (3 min) — *the centrepiece*

Walk the parameter panel briefly: population 100, crossover 0.8, mutation 0.05, tournament
5, elitism 0.2, 1000 generations.

> "These are the exact values specified in our proposal. Nothing here is tuned for the demo."

Press **Generate timetable**. Then stop talking and let them watch the chart for a few
seconds. When hard violations reach zero:

> "Generation thirteen. The red line is hard-constraint violations — it started at over a
> hundred and is now zero. That took about 750 milliseconds. Our requirement allowed 120
> seconds."

> "It's still running. Every conflict is gone, so it's now improving soft preferences —
> reducing teachers' idle gaps and spreading each batch's classes more evenly across the
> week."

Let it run in the background; move on rather than waiting for it.

---

## 5. The timetable (2.5 min)

Open **Timetable**. Note the green banner and the statistics, then select a specific batch —
**BCA — Semester 5A**.

> "This is what a student receives. Blue is a lecture, orange is a laboratory. Notice the lab
> occupies two consecutive periods in the same lab room, marked 'cont.' in the second hour —
> that's one session with a duration, not two sessions that happened to land next to each
> other."

Switch to **Teacher view** and pick an instructor.

> "The same timetable from the teacher's perspective. This is the view that replaces the
> printed sheet each teacher currently gets."

Switch to **Room view** briefly, then click **Export PDF**. Open the downloaded file.

> "One page per batch, print-ready, distributable as it stands. Excel gives one worksheet per
> batch instead."

---

## 6. Show the algorithm code (2 min)

Switch to the editor, `server/src/ga/`.

> "One file per stage of the algorithm, matching the seven steps in our proposal."

Open **`crossover.ts`**. It is ten lines.

> "Single-point crossover. The important property is that the offspring is always valid and
> never needs repairing — that's a consequence of the encoding: gene *i* of every chromosome
> answers the same question, so splicing two parents anywhere still gives exactly one
> placement per required session."

Open **`fitness.ts`** and point at the formula line.

> "`1 / (1 + total_penalty)`, exactly as the proposal specifies. Seven hard constraints at
> weight 100, four soft constraints at fractional weights."

Then open `server/package.json`.

> "No genetic algorithm library, no solver, no optimisation package. Express, Prisma, the
> export libraries — that's it. Every operator is our own code."

---

## 7. Evidence (1.5 min)

In a terminal:

```bash
npm test
```

> "Sixty-five tests. The important one is the property-based test: it runs twenty-five
> independent searches and, for every run reporting success, re-checks the decoded timetable
> directly for double-bookings. It doesn't trust the fitness counter, so a bug in the counter
> can't hide a bug in the schedule."

Then:

```bash
npm run bench:nfr1
```

> "Ten seeded runs of the benchmark configuration. Mean 753 milliseconds to a conflict-free
> timetable, worst case 800. The requirement is 120 seconds — PASS. Thirteen generations
> against a target of 500 — PASS. Every number in our Result Analysis chapter comes from this
> command, and you can run it yourself."

---

## 8. Close (30 s)

Return to the **Analysis** screen showing the run history.

> "Every run is stored with the parameters that produced it, so configurations can be
> compared directly. Our parameter sweep actually found that a mutation rate of 0.01
> converges faster than the 0.05 we specified in the proposal — we've kept 0.05 as the
> default so the system matches the proposal, and reported the better value as a finding."

> "The largest limitation is that regenerating produces a fresh timetable rather than
> minimally adjusting the existing one. When a single teacher becomes unavailable in week
> eight, minimal perturbation is what an administrator actually wants. That's the clearest
> direction for future work."

---

## Division of labour

Agree this in advance and rehearse the handovers — a panel notices hesitation.

| Section | Speaker |
|---|---|
| 1–3 Problem, data, feasibility | Member A |
| 4 Live generation | Member B |
| 5 Timetable and export | Member B |
| 6 Algorithm code | Member A |
| 7 Tests and benchmarks | Member A |
| 8 Close and limitations | Member B |

Both members must be able to answer questions on any section. Panels deliberately ask the
member who did not present a part.

---

## Recovery

| Symptom | Action |
|---|---|
| API not responding | `npm run db:up && npm run -w server dev`; check `/api/health` |
| Database empty or wrong | `npm run seed` — a few seconds, restores exactly |
| Live run misbehaves | Analysis screen → select the pre-generated run → show its curve |
| Browser or client broken | `npm run ga:cli` — the whole algorithm in the terminal |
| Total failure | Screenshots in `docs/screenshots/`, and the exported PDF |

Never debug in front of the panel. Switch to the fallback, keep talking, and offer to show
the fix afterwards.
