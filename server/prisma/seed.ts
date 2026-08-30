/**
 * Seed data for Academia International College.
 *
 * The dataset is deliberately sized to the exact configuration named in NFR1 --
 * "6 programs, 30 courses, 20 teachers, 15 rooms" -- so that the benchmark reported in
 * the Result Analysis chapter is run against the same data an examiner sees on screen.
 *
 * Course codes follow real Tribhuvan University FOHSS / IOST syllabus conventions.
 */
import { PrismaClient, Day, RoomType, CourseType, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DAYS: Day[] = [Day.SUN, Day.MON, Day.TUE, Day.WED, Day.THU, Day.FRI];

/** TU morning shift: six one-hour periods. */
const PERIODS = [
  { period: 1, startTime: '06:30', endTime: '07:30' },
  { period: 2, startTime: '07:30', endTime: '08:30' },
  { period: 3, startTime: '08:30', endTime: '09:30' },
  { period: 4, startTime: '09:30', endTime: '10:30' },
  { period: 5, startTime: '10:30', endTime: '11:30' },
  { period: 6, startTime: '11:30', endTime: '12:30' },
];

const DEPARTMENTS = [
  { code: 'DOCA', name: 'Department of Computer Application' },
  { code: 'DOCS', name: 'Department of Computer Science' },
  { code: 'DOMG', name: 'Department of Management' },
];

/** Six programmes, matching the NFR1 configuration. */
const PROGRAMS = [
  { code: 'BCA', name: 'Bachelor of Computer Application', dept: 'DOCA', semesters: 8 },
  { code: 'CSIT', name: 'B.Sc. Computer Science and Information Technology', dept: 'DOCS', semesters: 8 },
  { code: 'BIM', name: 'Bachelor of Information Management', dept: 'DOMG', semesters: 8 },
  { code: 'BBA', name: 'Bachelor of Business Administration', dept: 'DOMG', semesters: 8 },
  { code: 'BBM', name: 'Bachelor of Business Management', dept: 'DOMG', semesters: 8 },
  { code: 'BHM', name: 'Bachelor of Hotel Management', dept: 'DOMG', semesters: 8 },
];

/**
 * Thirty courses, five per programme, for the semester being scheduled.
 * `lec` = lectures per week, `lab` = two-period lab sessions per week.
 */
const COURSES = [
  // --- BCA, semester V (DOCA) ---
  { code: 'CACS301', name: 'Computer Networks', credits: 3, lec: 3, lab: 1, type: CourseType.LAB, dept: 'DOCA', program: 'BCA' },
  { code: 'CACS302', name: 'Introduction to Management', credits: 3, lec: 3, lab: 0, type: CourseType.LECTURE, dept: 'DOCA', program: 'BCA' },
  { code: 'CACS303', name: 'Programming in Java', credits: 3, lec: 3, lab: 1, type: CourseType.LAB, dept: 'DOCA', program: 'BCA' },
  { code: 'CACS304', name: 'Web Technology', credits: 3, lec: 3, lab: 1, type: CourseType.LAB, dept: 'DOCA', program: 'BCA' },
  { code: 'CACS305', name: 'Software Engineering', credits: 3, lec: 3, lab: 0, type: CourseType.LECTURE, dept: 'DOCA', program: 'BCA' },

  // --- B.Sc. CSIT, semester V (DOCS) ---
  { code: 'CSC311', name: 'Design and Analysis of Algorithms', credits: 3, lec: 3, lab: 1, type: CourseType.LAB, dept: 'DOCS', program: 'CSIT' },
  { code: 'CSC312', name: 'System Analysis and Design', credits: 3, lec: 3, lab: 0, type: CourseType.LECTURE, dept: 'DOCS', program: 'CSIT' },
  { code: 'CSC313', name: 'Cryptography', credits: 3, lec: 3, lab: 1, type: CourseType.LAB, dept: 'DOCS', program: 'CSIT' },
  { code: 'CSC314', name: 'Simulation and Modelling', credits: 3, lec: 3, lab: 0, type: CourseType.LECTURE, dept: 'DOCS', program: 'CSIT' },
  { code: 'CSC315', name: 'Web Technology II', credits: 3, lec: 3, lab: 1, type: CourseType.LAB, dept: 'DOCS', program: 'CSIT' },

  // --- BIM, semester V (DOMG) ---
  { code: 'IT221', name: 'Database Management System', credits: 3, lec: 3, lab: 1, type: CourseType.LAB, dept: 'DOMG', program: 'BIM' },
  { code: 'IT222', name: 'Operations Management', credits: 3, lec: 3, lab: 0, type: CourseType.LECTURE, dept: 'DOMG', program: 'BIM' },
  { code: 'IT223', name: 'Business Communication', credits: 3, lec: 3, lab: 0, type: CourseType.LECTURE, dept: 'DOMG', program: 'BIM' },
  { code: 'IT224', name: 'Object Oriented Programming', credits: 3, lec: 3, lab: 1, type: CourseType.LAB, dept: 'DOMG', program: 'BIM' },
  { code: 'IT225', name: 'Statistics for Business', credits: 3, lec: 3, lab: 0, type: CourseType.LECTURE, dept: 'DOMG', program: 'BIM' },

  // --- BBA, semester V (DOMG) ---
  { code: 'MGT311', name: 'Financial Management', credits: 3, lec: 3, lab: 0, type: CourseType.LECTURE, dept: 'DOMG', program: 'BBA' },
  { code: 'MGT312', name: 'Marketing Management', credits: 3, lec: 3, lab: 0, type: CourseType.LECTURE, dept: 'DOMG', program: 'BBA' },
  { code: 'MGT313', name: 'Human Resource Management', credits: 3, lec: 3, lab: 0, type: CourseType.LECTURE, dept: 'DOMG', program: 'BBA' },
  { code: 'MGT314', name: 'Business Research Methods', credits: 3, lec: 3, lab: 0, type: CourseType.LECTURE, dept: 'DOMG', program: 'BBA' },
  { code: 'MGT315', name: 'Management Information System', credits: 3, lec: 3, lab: 1, type: CourseType.LAB, dept: 'DOMG', program: 'BBA' },

  // --- BBM, semester V (DOMG) ---
  { code: 'BBM311', name: 'Cost and Management Accounting', credits: 3, lec: 3, lab: 0, type: CourseType.LECTURE, dept: 'DOMG', program: 'BBM' },
  { code: 'BBM312', name: 'Organizational Behaviour', credits: 3, lec: 3, lab: 0, type: CourseType.LECTURE, dept: 'DOMG', program: 'BBM' },
  { code: 'BBM313', name: 'Business Law', credits: 3, lec: 3, lab: 0, type: CourseType.LECTURE, dept: 'DOMG', program: 'BBM' },
  { code: 'BBM314', name: 'Entrepreneurship', credits: 3, lec: 3, lab: 0, type: CourseType.LECTURE, dept: 'DOMG', program: 'BBM' },
  { code: 'BBM315', name: 'Business Analytics', credits: 3, lec: 3, lab: 1, type: CourseType.LAB, dept: 'DOMG', program: 'BBM' },

  // --- BHM, semester V (DOMG) ---
  { code: 'BHM311', name: 'Food and Beverage Management', credits: 3, lec: 3, lab: 0, type: CourseType.LECTURE, dept: 'DOMG', program: 'BHM' },
  { code: 'BHM312', name: 'Front Office Operations', credits: 3, lec: 3, lab: 0, type: CourseType.LECTURE, dept: 'DOMG', program: 'BHM' },
  { code: 'BHM313', name: 'Hospitality Accounting', credits: 3, lec: 3, lab: 0, type: CourseType.LECTURE, dept: 'DOMG', program: 'BHM' },
  { code: 'BHM314', name: 'Tourism Geography', credits: 3, lec: 3, lab: 0, type: CourseType.LECTURE, dept: 'DOMG', program: 'BHM' },
  { code: 'BHM315', name: 'Hotel Information System', credits: 3, lec: 3, lab: 1, type: CourseType.LAB, dept: 'DOMG', program: 'BHM' },
];

/**
 * Twenty instructors. `teaches` lists the course codes each is qualified for -- the
 * "subject expertise" attribute of FR1. Overlapping qualifications are intentional:
 * they give the GA genuine choice, which is what makes the search non-trivial.
 */
const INSTRUCTORS = [
  { name: 'Ram Prasad Sharma', dept: 'DOCA', teaches: ['CACS301', 'CSC313', 'CACS305'] },
  { name: 'Sita Devi Adhikari', dept: 'DOCA', teaches: ['CACS303', 'IT224', 'CSC311'] },
  { name: 'Hari Bahadur Thapa', dept: 'DOCA', teaches: ['CACS304', 'CSC315', 'CACS303'] },
  { name: 'Gita Kumari Poudel', dept: 'DOCA', teaches: ['CACS305', 'CSC312', 'CACS302'] },
  { name: 'Bikash Shrestha', dept: 'DOCA', teaches: ['CACS302', 'MGT315', 'IT222'] },
  { name: 'Anita Maharjan', dept: 'DOCS', teaches: ['CSC311', 'CSC314', 'CACS305'] },
  { name: 'Rajesh Kumar Yadav', dept: 'DOCS', teaches: ['CSC312', 'IT221', 'CACS301'] },
  { name: 'Sunita Gurung', dept: 'DOCS', teaches: ['CSC313', 'CACS301', 'CSC314'] },
  { name: 'Prakash Bhattarai', dept: 'DOCS', teaches: ['CSC314', 'IT225', 'CSC311'] },
  { name: 'Nirmala Karki', dept: 'DOCS', teaches: ['CSC315', 'CACS304', 'IT224'] },
  { name: 'Deepak Raj Joshi', dept: 'DOMG', teaches: ['IT221', 'IT224', 'BBM315'] },
  { name: 'Kamala Rai', dept: 'DOMG', teaches: ['IT222', 'MGT311', 'BBM311'] },
  { name: 'Suresh Lamichhane', dept: 'DOMG', teaches: ['IT223', 'MGT312', 'BHM314'] },
  { name: 'Rita Tamang', dept: 'DOMG', teaches: ['IT225', 'MGT314', 'BBM312'] },
  { name: 'Mohan Bahadur Basnet', dept: 'DOMG', teaches: ['MGT311', 'BBM311', 'BHM313'] },
  { name: 'Sarita Chaudhary', dept: 'DOMG', teaches: ['MGT313', 'BBM312', 'BHM312'] },
  { name: 'Krishna Prasad Neupane', dept: 'DOMG', teaches: ['MGT315', 'BBM315', 'BHM315'] },
  { name: 'Laxmi Shakya', dept: 'DOMG', teaches: ['BBM313', 'MGT314', 'BHM311'] },
  { name: 'Binod Kumar Singh', dept: 'DOMG', teaches: ['BBM314', 'MGT313', 'BHM311'] },
  { name: 'Puja Bhandari', dept: 'DOMG', teaches: ['BHM312', 'BHM314', 'IT223'] },
];

/**
 * Fifteen rooms: eleven lecture halls and four laboratories.
 *
 * Lab capacities are deliberately large enough for the biggest cohort (BBA section A, 55
 * students). An earlier revision capped the labs at 40 and the feasibility checker
 * correctly refused to run, reporting "No laboratory can seat batch BBA Sem 5A". That
 * exchange is preserved as an infeasible fixture in the test suite, because it is the
 * cleanest available demonstration of NFR4.
 */
const ROOMS = [
  { number: 'A-101', building: 'Academic Block A', capacity: 60, type: RoomType.LECTURE_HALL },
  { number: 'A-102', building: 'Academic Block A', capacity: 60, type: RoomType.LECTURE_HALL },
  { number: 'A-103', building: 'Academic Block A', capacity: 50, type: RoomType.LECTURE_HALL },
  { number: 'A-104', building: 'Academic Block A', capacity: 50, type: RoomType.LECTURE_HALL },
  { number: 'A-201', building: 'Academic Block A', capacity: 45, type: RoomType.LECTURE_HALL },
  { number: 'A-202', building: 'Academic Block A', capacity: 45, type: RoomType.LECTURE_HALL },
  { number: 'B-101', building: 'Academic Block B', capacity: 40, type: RoomType.LECTURE_HALL },
  { number: 'B-102', building: 'Academic Block B', capacity: 40, type: RoomType.LECTURE_HALL },
  { number: 'B-201', building: 'Academic Block B', capacity: 70, type: RoomType.LECTURE_HALL },
  { number: 'B-202', building: 'Academic Block B', capacity: 70, type: RoomType.LECTURE_HALL },
  { number: 'B-203', building: 'Academic Block B', capacity: 35, type: RoomType.LECTURE_HALL },
  { number: 'LAB-1', building: 'IT Block', capacity: 60, type: RoomType.LAB },
  { number: 'LAB-2', building: 'IT Block', capacity: 55, type: RoomType.LAB },
  { number: 'LAB-3', building: 'IT Block', capacity: 45, type: RoomType.LAB },
  { number: 'LAB-4', building: 'IT Block', capacity: 40, type: RoomType.LAB },
];

/**
 * Twelve batches: each programme runs two sections of its semester V cohort.
 * Both sections study the same five courses, which is how TU colleges actually split
 * large intakes -- and it doubles the contention the GA has to resolve.
 */
const BATCHES = PROGRAMS.flatMap((p) => [
  { program: p.code, semester: 5, section: 'A', studentCount: 0 },
  { program: p.code, semester: 5, section: 'B', studentCount: 0 },
]);

/** Deterministic student counts, so the seed is byte-identical on every machine. */
const STUDENT_COUNTS: Record<string, number> = {
  'BCA-A': 48, 'BCA-B': 44, 'CSIT-A': 40, 'CSIT-B': 38,
  'BIM-A': 35, 'BIM-B': 32, 'BBA-A': 55, 'BBA-B': 52,
  'BBM-A': 30, 'BBM-B': 28, 'BHM-A': 34, 'BHM-B': 30,
};

async function main() {
  console.log('Clearing existing data...');
  await prisma.scheduleAssignment.deleteMany();
  await prisma.scheduleRun.deleteMany();
  await prisma.instructorAvailability.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.program.deleteMany();
  await prisma.instructor.deleteMany();
  await prisma.course.deleteMany();
  await prisma.room.deleteMany();
  await prisma.meetingTime.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();

  console.log('Creating users...');
  const adminHash = await bcrypt.hash('admin123', 10);
  const viewerHash = await bcrypt.hash('viewer123', 10);
  await prisma.user.createMany({
    data: [
      { name: 'Prajwal Basnet', email: 'admin@academia.edu.np', passwordHash: adminHash, role: UserRole.ADMIN },
      { name: 'Shekhar Paudel', email: 'shekhar@academia.edu.np', passwordHash: adminHash, role: UserRole.ADMIN },
      { name: 'Department Viewer', email: 'viewer@academia.edu.np', passwordHash: viewerHash, role: UserRole.VIEWER },
    ],
  });

  console.log('Creating departments...');
  const deptByCode = new Map<string, string>();
  for (const d of DEPARTMENTS) {
    const created = await prisma.department.create({ data: { code: d.code, name: d.name } });
    deptByCode.set(d.code, created.id);
  }

  console.log('Creating meeting times (6 days x 6 periods = 36 slots)...');
  const meetingTimeIds: string[] = [];
  for (const day of DAYS) {
    for (const p of PERIODS) {
      const mt = await prisma.meetingTime.create({
        data: { day, period: p.period, startTime: p.startTime, endTime: p.endTime },
      });
      meetingTimeIds.push(mt.id);
    }
  }

  console.log('Creating programs...');
  const programByCode = new Map<string, string>();
  for (const p of PROGRAMS) {
    const created = await prisma.program.create({
      data: { code: p.code, name: p.name, totalSemesters: p.semesters, departmentId: deptByCode.get(p.dept)! },
    });
    programByCode.set(p.code, created.id);
  }

  console.log('Creating courses...');
  const courseByCode = new Map<string, string>();
  for (const c of COURSES) {
    const created = await prisma.course.create({
      data: {
        code: c.code,
        name: c.name,
        creditHours: c.credits,
        lecturesPerWeek: c.lec,
        labsPerWeek: c.lab,
        type: c.type,
        departmentId: deptByCode.get(c.dept)!,
      },
    });
    courseByCode.set(c.code, created.id);
  }

  console.log('Creating instructors with qualifications and availability...');
  for (const [index, ins] of INSTRUCTORS.entries()) {
    const email = ins.name.toLowerCase().replace(/[^a-z]+/g, '.') + '@academia.edu.np';
    const created = await prisma.instructor.create({
      data: {
        name: ins.name,
        email,
        departmentId: deptByCode.get(ins.dept)!,
        courses: { connect: ins.teaches.map((code) => ({ id: courseByCode.get(code)! })) },
      },
    });

    // Availability: most staff are available for the full week. Four part-time staff
    // (every fifth instructor) are unavailable on Friday, which gives the hard
    // "instructor availability" constraint something real to bite on during the demo.
    const partTime = index % 5 === 4;
    await prisma.instructorAvailability.createMany({
      data: meetingTimeIds.map((mtId, slotIndex) => ({
        instructorId: created.id,
        meetingTimeId: mtId,
        // Slots 30..35 are Friday's six periods.
        isAvailable: partTime ? slotIndex < 30 : true,
      })),
    });
  }

  console.log('Creating batches...');
  for (const b of BATCHES) {
    const key = `${b.program}-${b.section}`;
    const courseCodes = COURSES.filter((c) => c.program === b.program).map((c) => courseByCode.get(c.code)!);
    await prisma.batch.create({
      data: {
        programId: programByCode.get(b.program)!,
        semester: b.semester,
        section: b.section,
        studentCount: STUDENT_COUNTS[key],
        courses: { connect: courseCodes.map((id) => ({ id })) },
      },
    });
  }

  const totals = {
    departments: await prisma.department.count(),
    programs: await prisma.program.count(),
    courses: await prisma.course.count(),
    instructors: await prisma.instructor.count(),
    rooms: 0,
    batches: await prisma.batch.count(),
    meetingTimes: await prisma.meetingTime.count(),
  };

  console.log('Creating rooms...');
  await prisma.room.createMany({ data: ROOMS });
  totals.rooms = await prisma.room.count();

  console.log('\nSeed complete. NFR1 benchmark configuration:');
  console.table(totals);
  console.log('\nLogins:');
  console.log('  admin@academia.edu.np  / admin123   (ADMIN)');
  console.log('  viewer@academia.edu.np / viewer123  (VIEWER)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
