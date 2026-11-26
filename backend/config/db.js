const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'student_portal.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to Student Portal SQLite DB:', err.message);
  } else {
    console.log('Connected to Student Portal SQLite database: student_portal.db');
  }
});

db.serialize(async () => {
  // 1. Students Table
  db.run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      roll_number TEXT UNIQUE NOT NULL,
      department TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      gpa REAL DEFAULT 3.84,
      semester TEXT DEFAULT 'Spring 2026',
      status TEXT DEFAULT 'Active',
      avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Courses Table
  db.run(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_code TEXT UNIQUE NOT NULL,
      course_name TEXT NOT NULL,
      instructor TEXT NOT NULL,
      credits INTEGER NOT NULL,
      department TEXT NOT NULL,
      schedule TEXT NOT NULL,
      capacity INTEGER DEFAULT 40,
      enrolled_count INTEGER DEFAULT 0
    )
  `);

  // 3. Enrollments Table (Many-to-Many student <-> course)
  db.run(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      attendance_percent INTEGER DEFAULT 95,
      grade TEXT DEFAULT 'A',
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (course_id) REFERENCES courses(id),
      UNIQUE(student_id, course_id)
    )
  `);

  // 4. Campus Announcements / Notices Table
  db.run(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      posted_date TEXT NOT NULL
    )
  `);

  // Seed sample demo student if table empty
  db.get(`SELECT COUNT(*) as count FROM students`, async (err, row) => {
    if (!err && row.count === 0) {
      const demoHash = await bcrypt.hash('password123', 10);
      db.run(
        `INSERT INTO students (full_name, email, roll_number, department, password_hash, gpa, semester, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['Alex Mercer', 'alex.mercer@campus.edu', 'CS2026-042', 'Computer Science', demoHash, 3.88, 'Spring 2026', 'Active']
      );
      console.log('Seeded demo student: alex.mercer@campus.edu / password123');
    }
  });

  // Seed courses if table empty
  db.get(`SELECT COUNT(*) as count FROM courses`, (err, row) => {
    if (!err && row.count === 0) {
      const stmt = db.prepare(
        `INSERT INTO courses (course_code, course_name, instructor, credits, department, schedule, capacity, enrolled_count) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );

      const catalog = [
        ['CS101', 'Data Structures & Algorithms', 'Dr. Alan Turing', 4, 'Computer Science', 'Mon / Wed 10:00 - 11:30 AM', 45, 38],
        ['CS202', 'Database Management Systems', 'Prof. Edgar Codd', 3, 'Computer Science', 'Tue / Thu 01:00 - 02:30 PM', 40, 32],
        ['CS303', 'Distributed Systems & Cloud', 'Dr. Leslie Lamport', 4, 'Computer Science', 'Mon / Wed 02:00 - 03:30 PM', 35, 29],
        ['CS404', 'Web Architecture & Modern UI', 'Prof. Tim Berners-Lee', 3, 'Computer Science', 'Fri 09:00 - 12:00 PM', 30, 27],
        ['AI210', 'Applied Machine Learning', 'Dr. Geoffrey Hinton', 4, 'Data Science', 'Tue / Thu 10:30 - 12:00 PM', 40, 35],
        ['SEC350', 'Network Security & Cryptography', 'Dr. Whitfield Diffie', 3, 'Information Tech', 'Wed / Fri 03:00 - 04:30 PM', 35, 22]
      ];

      catalog.forEach((c) => stmt.run(...c));
      stmt.finalize(() => {
        // Enroll demo student in CS101, CS202, CS303
        db.run(`INSERT OR IGNORE INTO enrollments (student_id, course_id, attendance_percent, grade) VALUES (1, 1, 96, 'A')`);
        db.run(`INSERT OR IGNORE INTO enrollments (student_id, course_id, attendance_percent, grade) VALUES (1, 2, 92, 'A-')`);
        db.run(`INSERT OR IGNORE INTO enrollments (student_id, course_id, attendance_percent, grade) VALUES (1, 3, 94, 'A')`);
        console.log('Seeded catalog and student enrollments.');
      });
    }
  });

  // Seed announcements if empty
  db.get(`SELECT COUNT(*) as count FROM announcements`, (err, row) => {
    if (!err && row.count === 0) {
      const stmt = db.prepare(`INSERT INTO announcements (title, category, content, posted_date) VALUES (?, ?, ?, ?)`);
      stmt.run(
        'Mid-Term Examination Schedule Published',
        'Exam',
        'The Spring 2026 mid-term examinations schedule has been uploaded to the student portal. Review your exam room allocations.',
        'Today'
      );
      stmt.run(
        'Annual Tech Hackathon 2026 Registration Open',
        'Campus',
        'Form teams of 2 to 4 students for the 36-hour Campus Hackathon. Top prizes include cloud credits and summer research internships.',
        'Yesterday'
      );
      stmt.run(
        'Course Add/Drop Period Deadline: Friday',
        'Academic',
        'Course add/drop requests for the Spring semester close this Friday at 11:59 PM. Ensure credit load is between 12 and 18 credits.',
        '3 days ago'
      );
      stmt.run(
        'Campus Cloud Lab Maintenance Window',
        'Urgent',
        'Server maintenance scheduled this Sunday from 02:00 AM to 06:00 AM UTC. Cloud IDE services may be intermittently offline.',
        '4 days ago'
      );
      stmt.finalize();
      console.log('Seeded campus announcements.');
    }
  });
});

module.exports = db;
