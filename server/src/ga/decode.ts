/**
 * Decodes the winning chromosome into the assignment tuples the rest of the system stores,
 * renders and exports.
 *
 * Proposal Step 7: "The best chromosome from the final generation is decoded into the
 * output timetable." A two-period lab is stored as two assignment rows sharing one
 * `sessionGroupId`, because the timetable grid renders one cell per period -- the grouping
 * id is what lets the UI merge them back into a single visual block.
 */
import type { Assignment } from '@schedular/shared';
import type { ProblemContext } from './context';
import type { Chromosome } from './types';

export function decodeChromosome(ctx: ProblemContext, chromosome: Chromosome): Assignment[] {
  const assignments: Assignment[] = [];

  for (let i = 0; i < chromosome.length; i++) {
    const gene = chromosome[i];
    const req = ctx.requirements[i];

    for (let d = 0; d < req.duration; d++) {
      const slot = gene.startSlot + d;
      const meetingTimeIndex = ctx.slotToMeetingTime[slot];
      if (meetingTimeIndex < 0) continue;

      assignments.push({
        courseId: ctx.courses[req.courseIndex].id,
        instructorId: ctx.instructors[gene.instructorIndex].id,
        roomId: ctx.rooms[gene.roomIndex].id,
        meetingTimeId: ctx.meetingTimes[meetingTimeIndex].id,
        batchId: ctx.batches[req.batchIndex].id,
        sessionType: req.sessionType,
        sessionGroupId: req.sessionGroupId,
      });
    }
  }

  return assignments;
}
