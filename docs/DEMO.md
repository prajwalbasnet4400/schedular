# Live Demonstration Script

A rehearsed five-minute path through the system. There is one page and one button, so the
time goes on explaining the algorithm, not on clicking.

**Rehearse this end to end at least twice on the machine you will present from.**

---

## Before the panel arrives

```bash
cd schedular
npm install        # once
npm test           # 10 tests should pass; confirms the machine is fine
npm run dev        # opens on http://localhost:5173
```

Then:

1. Open `http://localhost:5173`. **Do not press Generate yet.**
2. Have an editor open on `src/ga/`, and a terminal ready in the project folder.
3. Close everything else. Silence notifications.

Nothing needs resetting between rehearsals: the seed is fixed at 42, so every run is
identical. Reloading the page is a full reset.

---

## 1. Frame the problem (45 s), no screen — *Prajwal*

> "Scheduling a college timetable is NP-hard. A committee spends weeks each semester building
> it by hand, and it still ships with clashes. Our genetic algorithm produces a clash-free
> timetable in under a second."

---

## 2. The data (30 s) — *Prajwal*

Point at the line under the title: **4 batches, 8 courses, 5 teachers, 3 rooms → 48
sessions to place in 36 weekly slots.**

> "Two programmes, BCA and B.Sc. CSIT, with two sections each. Every course has three lectures
> a week, Sunday to Friday, six morning periods. We kept it small so it is quick to explain,
> but a random start still has around a dozen clashes. This sample data lives in
> `src/data.ts`, and every number we quote here is measured on it. The larger NFR1
> configuration was measured separately; it is in our report."

---

> Tip: every box, the chart and the timetable have a short explanation printed under them.
> If you lose your place, read the caption.

## 3. Generate, live (1.5 min) — *Shekhar*

> "The parameters are exactly the proposal's: population 100, crossover 0.8, mutation 0.05,
> tournament of 5, 20% elitism, up to 1000 generations. They are editable here, but we run
> the defaults."

If the panel asks, change one (e.g. mutation to 0.1 or the seed), press Generate, then
**Reset to proposal defaults**.

Press **Generate timetable**. Stay quiet for two seconds and let them watch the chart.

> "The red line is hard violations: teacher, room or batch clashes. It starts at twelve. By
> generation two it is zero. That took about 30 milliseconds; our requirement allowed 120
> seconds."

The **Hard violations** line drops almost instantly, so point at the fitness line: that is the
one to watch.

> "It keeps going. Every clash is gone, so now it is polishing soft preferences: fewer idle
> gaps for teachers and a more even spread of each batch's classes across the week. That is
> the blue fitness line climbing."

When it stops (generation 38, under half a second), read the green line:

> "Fitness is exactly 1.0: zero hard and zero soft penalty. That is the stopping condition
> our proposal wrote, and Expected Outcome 2 asked for it within 500 generations; we reach
> it at 38."

---

## 4. The timetable (1 min) — *Shekhar*

Scroll down to the grid. It opens on **BCA 5A**.

> "This is what a student group receives. Each cell shows course, teacher and room. If two
> classes landed in the same slot for this batch, you would see two cards stacked in one
> cell. There are none."

Switch the first dropdown to **By teacher** and pick a teacher, then **By room** and pick a
room.

> "Same timetable from a teacher's side and a room's side. Again, never two cards in one cell:
> no teacher in two places, no room booked twice."

---

## 4b. Edit the data (30 s, optional) — *Shekhar*

Open **Edit college data**. On the **Teachers** tab rename a teacher (or on **Rooms** remove
one with ×), press **Generate timetable**, and show the change in the grid (the new name
**By teacher**, or the room gone from **By room**).

> "Courses, teachers, rooms and batches can be edited here. Impossible data, such as a course
> nobody can teach, is reported and Generate is disabled. Edits live only in the page's
> memory: there is no database, so nothing is saved."

Then press **Reset to sample data** so the rest of the demo matches the quoted numbers.

---

## 5. The code (1 min, optional) — *Prajwal*

Switch to the editor on `src/ga/`.

> "One file per step of our proposal: `problem.ts` is Step 1, the encoding, `population.ts`
> Step 2, `fitness.ts` Step 3, `selection.ts` 4, `crossover.ts` 5, `mutation.ts` 6,
> `engine.ts` 7. `repair.ts` is our addition, and it says so at the top."

Open **`crossover.ts`**:

> "Single-point crossover. The child is always valid because gene *i* always means session
> *i*, so splicing anywhere still gives one placement per session."

Open **`fitness.ts`** at line 71: `1 / (1 + penalty)`.

If time allows, open **`repair.ts`**:

> "Without this, the plain GA takes about 16 generations to become clash-free and reaches
> fitness 1.0 on only two seeds out of ten. With it, about two, and every seed reaches 1.0.
> It only keeps a change that lowers the penalty."

---

## 6. Tests (30 s) — *Prajwal*

In the terminal:

```bash
npm test
```

> "Ten tests: the encoding, that unknown or duplicate course codes are rejected, clash
> detection, that crossover and mutation keep genes valid, and a full run that must be clash-free within 500 generations and 120 seconds."

---

## 7. Close (30 s) — *Shekhar*

> "We deliberately cut the system down to the algorithm. The data can be edited on the page
> but is not saved; export, login and the database from the proposal are not implemented;
> the GA is what we built and measured. The
> clearest next step is rescheduling: adjusting an existing timetable when one teacher
> becomes unavailable, instead of generating a fresh one."

Saying the scope cut out loud here is intentional. See `DEFENSE.md` section E.

---

## Division of labour

**Not yet agreed; confirm between Prajwal and Shekhar before rehearsal.** Proposed:

| Section | Speaker |
|---|---|
| 1–2 Problem and data | Prajwal |
| 3 Live generation | Shekhar |
| 4 Timetable (4b data edit, optional) | Shekhar |
| 5–6 Code and tests | Prajwal |
| 7 Close and scope | Shekhar |

Both must be able to answer questions on any section. Panels deliberately ask the member
who did not present a part.

---

## Recovery

| Symptom | Action |
|---|---|
| Page stuck or odd state | Reload the page. Nothing is stored (edits are lost too); the next run is identical. |
| Page does not load | `npm run dev` in the terminal, then reopen `http://localhost:5173` |
| Module errors on start | `npm install`, then `npm run dev` |
| Browser unusable | `npm test`: the last test runs the whole GA in the terminal |

Never debug in front of the panel. Switch to the fallback, keep talking, and offer to show
the fix afterwards.
