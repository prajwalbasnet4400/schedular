/**
 * Synthetic problem instances of varying size, for the scalability benchmark.
 *
 * The "medium" instance reproduces the exact configuration named in NFR1 -- 6 programs,
 * 30 courses, 20 teachers, 15 rooms -- so the headline benchmark measures precisely the
 * claim the proposal makes, rather than something merely similar.
 */
import { ProblemContext } from '../server/src/ga/context';
import type { RawInput } from '../server/src/ga/context';
import { DAYS, PERIODS_PER_DAY } from '@schedular/shared';
import { Rng } from '../server/src/ga/rng';

export interface InstanceSpec {
  name: string;
  programs: number;
  coursesPerProgram: number;
  sectionsPerProgram: number;
  instructors: number;
  lectureRooms: number;
  labRooms: number;
}

export const INSTANCES: InstanceSpec[] = [
  { name: 'small', programs: 2, coursesPerProgram: 5, sectionsPerProgram: 1, instructors: 8, lectureRooms: 4, labRooms: 2 },
  // NFR1: "6 programs, 30 courses, 20 teachers, 15 rooms".
  { name: 'medium (NFR1)', programs: 6, coursesPerProgram: 5, sectionsPerProgram: 2, instructors: 20, lectureRooms: 11, labRooms: 4 },
  { name: 'large', programs: 8, coursesPerProgram: 6, sectionsPerProgram: 2, instructors: 30, lectureRooms: 16, labRooms: 6 },
  { name: 'stress', programs: 10, coursesPerProgram: 6, sectionsPerProgram: 3, instructors: 45, lectureRooms: 24, labRooms: 8 },
];

function meetingTimes() {
  const out = [];
  for (const day of DAYS) {
    for (let period = 1; period <= PERIODS_PER_DAY; period++) {
      out.push({ id: `mt-${day}-${period}`, day, period });
    }
  }
  return out;
}

export function buildInstance(spec: InstanceSpec, seed = 1): ProblemContext {
  const rng = new Rng(seed);

  const courses: RawInput['courses'] = [];
  for (let p = 0; p < spec.programs; p++) {
    for (let c = 0; c < spec.coursesPerProgram; c++) {
      // Every third course carries a laboratory, mirroring the seed dataset's mix.
      const hasLab = c % 3 === 0;
      courses.push({
        id: `p${p}c${c}`,
        code: `P${p}C${c}`,
        name: `Program ${p} Course ${c}`,
        lecturesPerWeek: 3,
        labsPerWeek: hasLab ? 1 : 0,
        type: hasLab ? 'LAB' : 'LECTURE',
      });
    }
  }

  // Each course gets three qualified instructors, spread evenly across the staff, so no
  // course is a bottleneck and the search has genuine freedom.
  const qualifications = new Map<string, string[]>();
  courses.forEach((course, index) => {
    const staff: string[] = [];
    for (let k = 0; k < 3; k++) staff.push(`i${(index * 3 + k * 7) % spec.instructors}`);
    qualifications.set(course.id, [...new Set(staff)]);
  });

  const instructors: RawInput['instructors'] = Array.from({ length: spec.instructors }, (_, i) => {
    const id = `i${i}`;
    const qualifiedCourseIds = courses.filter((c) => qualifications.get(c.id)!.includes(id)).map((c) => c.id);
    return {
      id,
      name: `Instructor ${i}`,
      // Ensure nobody is left unqualified for everything, which would make them dead weight.
      qualifiedCourseIds: qualifiedCourseIds.length > 0 ? qualifiedCourseIds : [courses[i % courses.length].id],
      availableSlotIds: meetingTimes().map((m) => m.id),
    };
  });

  const rooms: RawInput['rooms'] = [
    ...Array.from({ length: spec.lectureRooms }, (_, i) => ({
      id: `lr${i}`,
      number: `R${i}`,
      capacity: 70,
      type: 'LECTURE_HALL' as const,
    })),
    ...Array.from({ length: spec.labRooms }, (_, i) => ({
      id: `lb${i}`,
      number: `LAB${i}`,
      capacity: 70,
      type: 'LAB' as const,
    })),
  ];

  const batches: RawInput['batches'] = [];
  for (let p = 0; p < spec.programs; p++) {
    for (let s = 0; s < spec.sectionsPerProgram; s++) {
      batches.push({
        id: `b${p}-${s}`,
        label: `Program ${p} Section ${String.fromCharCode(65 + s)}`,
        studentCount: 30 + rng.int(25),
        courseIds: courses.filter((c) => c.id.startsWith(`p${p}c`)).map((c) => c.id),
      });
    }
  }

  return new ProblemContext({ courses, instructors, rooms, batches, meetingTimes: meetingTimes() });
}
