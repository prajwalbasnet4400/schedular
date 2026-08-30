/**
 * Pre-flight feasibility analysis, satisfying NFR4:
 *
 *   "The system shall provide meaningful error messages when the input data makes a
 *    feasible schedule impossible, for example when the number of required sessions
 *    exceeds available room-time slot combinations."
 *
 * This runs before the GA, not after. A genetic algorithm cannot distinguish "no solution
 * exists" from "I have not found the solution yet": both look like a population that stops
 * improving. Left to itself it would burn 1000 generations and then report a low fitness
 * score, telling the administrator nothing about what to fix. Every check below is a
 * necessary condition for a solution to exist, so failing one is a proof of impossibility
 * that can be reported immediately, in the administrator's own vocabulary.
 */
import type { FeasibilityIssue, FeasibilityReport } from '@schedular/shared';
import type { ProblemContext } from './context';

export function analyseFeasibility(ctx: ProblemContext): FeasibilityReport {
  const errors: FeasibilityIssue[] = [];
  const warnings: FeasibilityIssue[] = [];

  const slotCount = ctx.meetingTimes.length;
  const requiredPeriods = ctx.totalPeriods;
  const availableRoomSlots = ctx.rooms.length * slotCount;

  // --- Nothing to schedule ---
  if (ctx.requirements.length === 0) {
    errors.push({
      code: 'NO_SESSIONS',
      message:
        'No class sessions are required. Register at least one batch with enrolled courses that have weekly lectures or labs.',
    });
  }
  if (slotCount === 0) {
    errors.push({ code: 'NO_TIME_SLOTS', message: 'No time slots are defined. Register the weekly period grid first.' });
  }
  if (ctx.rooms.length === 0) {
    errors.push({ code: 'NO_ROOMS', message: 'No rooms are registered. At least one room is required.' });
  }

  // --- Global capacity: the pigeonhole bound ---
  if (requiredPeriods > availableRoomSlots) {
    errors.push({
      code: 'INSUFFICIENT_ROOM_SLOTS',
      message:
        `The timetable needs ${requiredPeriods} room-periods but only ${availableRoomSlots} exist ` +
        `(${ctx.rooms.length} rooms x ${slotCount} slots). Add rooms, add time slots, or reduce the weekly session load.`,
    });
  }

  // --- Per-course: is anyone qualified to teach it, and is there a room it fits in? ---
  const seenCourse = new Set<number>();
  const seenBatchRoom = new Set<string>();
  for (const req of ctx.requirements) {
    const course = ctx.courses[req.courseIndex];
    const batch = ctx.batches[req.batchIndex];

    if (req.eligibleInstructors.length === 0 && !seenCourse.has(req.courseIndex)) {
      seenCourse.add(req.courseIndex);
      errors.push({
        code: 'NO_QUALIFIED_INSTRUCTOR',
        message: `No instructor is qualified to teach ${course.code} (${course.name}). Assign this course to at least one instructor.`,
        entity: { type: 'course', id: course.id, label: `${course.code} ${course.name}` },
      });
    }

    const key = `${req.batchIndex}:${req.sessionType}`;
    if (req.eligibleRooms.length === 0 && !seenBatchRoom.has(key)) {
      seenBatchRoom.add(key);
      const kind = req.sessionType === 'LAB' ? 'laboratory' : 'room';
      errors.push({
        code: 'NO_SUITABLE_ROOM',
        message:
          `No ${kind} can seat batch ${batch.label} (${batch.studentCount} students) for ${course.code}. ` +
          `Add a ${kind} with capacity of at least ${batch.studentCount}.`,
        entity: { type: 'batch', id: batch.id, label: batch.label },
      });
    }

    if (req.eligibleStartSlots.length === 0) {
      errors.push({
        code: 'NO_VALID_START_SLOT',
        message:
          `${course.code} requires a ${req.duration}-period session but no day has ${req.duration} consecutive periods available.`,
        entity: { type: 'course', id: course.id, label: course.code },
      });
    }
  }

  // --- Per-batch: a batch cannot attend more periods than the week contains ---
  const batchLoad = new Int32Array(ctx.batches.length);
  for (const req of ctx.requirements) batchLoad[req.batchIndex] += req.duration;
  ctx.batches.forEach((batch, i) => {
    if (batchLoad[i] > slotCount) {
      errors.push({
        code: 'BATCH_OVERLOADED',
        message:
          `Batch ${batch.label} needs ${batchLoad[i]} periods per week but only ${slotCount} slots exist. ` +
          `Reduce its course load or extend the weekly grid.`,
        entity: { type: 'batch', id: batch.id, label: batch.label },
      });
    }
  });

  // --- Per-instructor: total demand vs total declared availability ---
  // Sessions that only one instructor can teach are that instructor's guaranteed load.
  const forcedLoad = new Int32Array(ctx.instructors.length);
  for (const req of ctx.requirements) {
    if (req.eligibleInstructors.length === 1) forcedLoad[req.eligibleInstructors[0]] += req.duration;
  }
  ctx.instructors.forEach((instructor, i) => {
    const availableSlots = instructor.availableSlotIds.length;
    if (forcedLoad[i] > availableSlots) {
      errors.push({
        code: 'INSTRUCTOR_OVERLOADED',
        message:
          `${instructor.name} is the only qualified instructor for ${forcedLoad[i]} periods per week but has declared ` +
          `only ${availableSlots} available slots. Widen their availability or qualify another instructor.`,
        entity: { type: 'instructor', id: instructor.id, label: instructor.name },
      });
    }
  });

  // --- Warnings: satisfiable, but the search will be hard ---
  const utilisationRatio = availableRoomSlots > 0 ? requiredPeriods / availableRoomSlots : 0;
  if (errors.length === 0 && utilisationRatio > 0.85) {
    warnings.push({
      code: 'HIGH_UTILISATION',
      message:
        `Room utilisation would be ${(utilisationRatio * 100).toFixed(1)}%. Above roughly 85% the search space becomes ` +
        `very tight and the algorithm may need considerably more generations to reach a conflict-free schedule.`,
    });
  }

  const soleQualified = ctx.requirements.filter((r) => r.eligibleInstructors.length === 1).length;
  if (errors.length === 0 && soleQualified > ctx.requirements.length * 0.5) {
    warnings.push({
      code: 'LIMITED_TEACHER_CHOICE',
      message:
        `${soleQualified} of ${ctx.requirements.length} sessions have exactly one qualified instructor. ` +
        `Qualifying more instructors per course gives the algorithm room to resolve clashes.`,
    });
  }

  return {
    feasible: errors.length === 0,
    errors,
    warnings,
    stats: {
      requiredSessions: ctx.requirements.length,
      availableRoomSlots,
      utilisationRatio,
      batches: ctx.batches.length,
      courses: ctx.courses.length,
      instructors: ctx.instructors.length,
      rooms: ctx.rooms.length,
      timeSlots: slotCount,
    },
  };
}
