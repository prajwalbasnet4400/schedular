/**
 * The sample college data the algorithm schedules. It can be edited on the page.
 *
 * Kept small on purpose: 2 programmes with 2 sections each (4 batches), 8 courses,
 * 5 teachers and 3 rooms. Every course has 3 lectures a week, so there are
 * 4 batches x 4 courses x 3 = 48 sessions to place in 36 slots.
 */

export interface Course {
  code: string;
  name: string;
  lecturesPerWeek: number;
}

export interface Teacher {
  name: string;
  /** Course codes this teacher is qualified to teach. */
  courses: string[];
}

export interface Room {
  name: string;
  capacity: number;
}

export interface Batch {
  name: string;
  size: number;
  /** Course codes this batch takes. */
  courses: string[];
}

export interface CollegeData {
  courses: Course[];
  teachers: Teacher[];
  rooms: Room[];
  batches: Batch[];
}

/** Sunday to Friday; Saturday is a holiday in Nepal. */
export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/** Six one-hour periods of the TU morning shift. */
export const PERIODS = ['06:30', '07:30', '08:30', '09:30', '10:30', '11:30'];

const course = (code: string, name: string): Course => ({ code, name, lecturesPerWeek: 3 });

const COURSES: Course[] = [
  // BCA
  course('CACS301', 'Computer Networks'),
  course('CACS302', 'Introduction to Management'),
  course('CACS303', 'Programming in Java'),
  course('CACS304', 'Web Technology'),
  // B.Sc. CSIT
  course('CSC311', 'Design and Analysis of Algorithms'),
  course('CSC312', 'System Analysis and Design'),
  course('CSC313', 'Cryptography'),
  course('CSC314', 'Simulation and Modelling'),
];

/** Qualifications overlap on purpose, so the algorithm has a real choice of teacher. */
const TEACHERS: Teacher[] = [
  { name: 'Ram Prasad Sharma', courses: ['CACS301', 'CSC313'] },
  { name: 'Sita Devi Adhikari', courses: ['CACS303', 'CSC311'] },
  { name: 'Hari Bahadur Thapa', courses: ['CACS304', 'CACS303'] },
  { name: 'Gita Kumari Poudel', courses: ['CACS302', 'CSC312'] },
  { name: 'Anita Maharjan', courses: ['CSC314', 'CACS301', 'CSC311'] },
];

const ROOMS: Room[] = [
  { name: 'A-101', capacity: 50 },
  { name: 'A-102', capacity: 45 },
  { name: 'B-101', capacity: 40 },
];

const BCA = ['CACS301', 'CACS302', 'CACS303', 'CACS304'];
const CSIT = ['CSC311', 'CSC312', 'CSC313', 'CSC314'];

const BATCHES: Batch[] = [
  { name: 'BCA 5A', size: 48, courses: BCA },
  { name: 'BCA 5B', size: 44, courses: BCA },
  { name: 'CSIT 5A', size: 40, courses: CSIT },
  { name: 'CSIT 5B', size: 38, courses: CSIT },
];

export const COLLEGE: CollegeData = {
  courses: COURSES,
  teachers: TEACHERS,
  rooms: ROOMS,
  batches: BATCHES,
};
