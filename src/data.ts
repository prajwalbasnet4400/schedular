/**
 * The college data the algorithm schedules.
 *
 * Sized to the NFR1 configuration in the proposal: 6 programmes, 30 courses, 20 teachers,
 * 15 rooms. Each programme runs two sections, so there are 12 batches. Every course has
 * 3 lectures a week, which gives 12 batches x 5 courses x 3 = 180 sessions to place.
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
  course('CACS305', 'Software Engineering'),
  // B.Sc. CSIT
  course('CSC311', 'Design and Analysis of Algorithms'),
  course('CSC312', 'System Analysis and Design'),
  course('CSC313', 'Cryptography'),
  course('CSC314', 'Simulation and Modelling'),
  course('CSC315', 'Web Technology II'),
  // BIM
  course('IT221', 'Database Management System'),
  course('IT222', 'Operations Management'),
  course('IT223', 'Business Communication'),
  course('IT224', 'Object Oriented Programming'),
  course('IT225', 'Statistics for Business'),
  // BBA
  course('MGT311', 'Financial Management'),
  course('MGT312', 'Marketing Management'),
  course('MGT313', 'Human Resource Management'),
  course('MGT314', 'Business Research Methods'),
  course('MGT315', 'Management Information System'),
  // BBM
  course('BBM311', 'Cost and Management Accounting'),
  course('BBM312', 'Organizational Behaviour'),
  course('BBM313', 'Business Law'),
  course('BBM314', 'Entrepreneurship'),
  course('BBM315', 'Business Analytics'),
  // BHM
  course('BHM311', 'Food and Beverage Management'),
  course('BHM312', 'Front Office Operations'),
  course('BHM313', 'Hospitality Accounting'),
  course('BHM314', 'Tourism Geography'),
  course('BHM315', 'Hotel Information System'),
];

/** Qualifications overlap on purpose, so the algorithm has a real choice of teacher. */
const TEACHERS: Teacher[] = [
  { name: 'Ram Prasad Sharma', courses: ['CACS301', 'CSC313', 'CACS305'] },
  { name: 'Sita Devi Adhikari', courses: ['CACS303', 'IT224', 'CSC311'] },
  { name: 'Hari Bahadur Thapa', courses: ['CACS304', 'CSC315', 'CACS303'] },
  { name: 'Gita Kumari Poudel', courses: ['CACS305', 'CSC312', 'CACS302'] },
  { name: 'Bikash Shrestha', courses: ['CACS302', 'MGT315', 'IT222'] },
  { name: 'Anita Maharjan', courses: ['CSC311', 'CSC314', 'CACS305'] },
  { name: 'Rajesh Kumar Yadav', courses: ['CSC312', 'IT221', 'CACS301'] },
  { name: 'Sunita Gurung', courses: ['CSC313', 'CACS301', 'CSC314'] },
  { name: 'Prakash Bhattarai', courses: ['CSC314', 'IT225', 'CSC311'] },
  { name: 'Nirmala Karki', courses: ['CSC315', 'CACS304', 'IT224'] },
  { name: 'Deepak Raj Joshi', courses: ['IT221', 'IT224', 'BBM315'] },
  { name: 'Kamala Rai', courses: ['IT222', 'MGT311', 'BBM311'] },
  { name: 'Suresh Lamichhane', courses: ['IT223', 'MGT312', 'BHM314'] },
  { name: 'Rita Tamang', courses: ['IT225', 'MGT314', 'BBM312'] },
  { name: 'Mohan Bahadur Basnet', courses: ['MGT311', 'BBM311', 'BHM313'] },
  { name: 'Sarita Chaudhary', courses: ['MGT313', 'BBM312', 'BHM312'] },
  { name: 'Krishna Prasad Neupane', courses: ['MGT315', 'BBM315', 'BHM315'] },
  { name: 'Laxmi Shakya', courses: ['BBM313', 'MGT314', 'BHM311'] },
  { name: 'Binod Kumar Singh', courses: ['BBM314', 'MGT313', 'BHM311'] },
  { name: 'Puja Bhandari', courses: ['BHM312', 'BHM314', 'IT223'] },
];

const ROOMS: Room[] = [
  { name: 'A-101', capacity: 60 },
  { name: 'A-102', capacity: 60 },
  { name: 'A-103', capacity: 50 },
  { name: 'A-104', capacity: 50 },
  { name: 'A-201', capacity: 45 },
  { name: 'A-202', capacity: 45 },
  { name: 'B-101', capacity: 40 },
  { name: 'B-102', capacity: 40 },
  { name: 'B-201', capacity: 70 },
  { name: 'B-202', capacity: 70 },
  { name: 'B-203', capacity: 35 },
  { name: 'C-101', capacity: 60 },
  { name: 'C-102', capacity: 55 },
  { name: 'C-103', capacity: 45 },
  { name: 'C-104', capacity: 40 },
];

/** Both sections of a programme take the same five courses. */
const coursesOf = (prefix: string) => COURSES.filter((c) => c.code.startsWith(prefix)).map((c) => c.code);

const BATCHES: Batch[] = [
  { name: 'BCA 5A', size: 48, courses: coursesOf('CACS') },
  { name: 'BCA 5B', size: 44, courses: coursesOf('CACS') },
  { name: 'CSIT 5A', size: 40, courses: coursesOf('CSC') },
  { name: 'CSIT 5B', size: 38, courses: coursesOf('CSC') },
  { name: 'BIM 5A', size: 35, courses: coursesOf('IT') },
  { name: 'BIM 5B', size: 32, courses: coursesOf('IT') },
  { name: 'BBA 5A', size: 55, courses: coursesOf('MGT') },
  { name: 'BBA 5B', size: 52, courses: coursesOf('MGT') },
  { name: 'BBM 5A', size: 30, courses: coursesOf('BBM') },
  { name: 'BBM 5B', size: 28, courses: coursesOf('BBM') },
  { name: 'BHM 5A', size: 34, courses: coursesOf('BHM') },
  { name: 'BHM 5B', size: 30, courses: coursesOf('BHM') },
];

export const COLLEGE: CollegeData = {
  courses: COURSES,
  teachers: TEACHERS,
  rooms: ROOMS,
  batches: BATCHES,
};
