const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Announcement = require('../models/Announcement');

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/student_portal';

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[MongoDB] Connected successfully to: ${mongoose.connection.host}/${mongoose.connection.name}`);
    await autoSeedDatabase();
  } catch (error) {
    console.error('[MongoDB] Connection error:', error.message);
    console.error('Make sure MongoDB Atlas connection string is provided in .env or local MongoDB is running.');
  }
}

async function autoSeedDatabase() {
  try {
    const studentCount = await Student.countDocuments();
    if (studentCount > 0) return;

    console.log('[MongoDB] Empty collection detected. Auto-seeding initial data...');

    // 1. Seed Demo Student
    const demoPasswordHash = await bcrypt.hash('password123', 10);
    const demoStudent = await Student.create({
      fullName: 'Alex Mercer',
      email: 'alex.mercer@campus.edu',
      rollNumber: 'CS2026-042',
      department: 'Computer Science',
      passwordHash: demoPasswordHash,
      gpa: 3.88,
      semester: 'Spring 2026',
      status: 'Active',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
    });

    // 2. Seed Course Catalog
    const coursesData = [
      {
        courseCode: 'CS101',
        courseName: 'Data Structures & Algorithms',
        instructor: 'Dr. Alan Turing',
        credits: 4,
        department: 'Computer Science',
        schedule: 'Mon / Wed 10:00 - 11:30 AM',
        capacity: 45,
        enrolledCount: 39
      },
      {
        courseCode: 'CS202',
        courseName: 'Database Management Systems',
        instructor: 'Prof. Edgar Codd',
        credits: 3,
        department: 'Computer Science',
        schedule: 'Tue / Thu 01:00 - 02:30 PM',
        capacity: 40,
        enrolledCount: 33
      },
      {
        courseCode: 'CS303',
        courseName: 'Distributed Systems & Cloud',
        instructor: 'Dr. Leslie Lamport',
        credits: 4,
        department: 'Computer Science',
        schedule: 'Mon / Wed 02:00 - 03:30 PM',
        capacity: 35,
        enrolledCount: 30
      },
      {
        courseCode: 'CS404',
        courseName: 'Web Architecture & Modern UI',
        instructor: 'Prof. Tim Berners-Lee',
        credits: 3,
        department: 'Computer Science',
        schedule: 'Fri 09:00 - 12:00 PM',
        capacity: 30,
        enrolledCount: 27
      },
      {
        courseCode: 'AI210',
        courseName: 'Applied Machine Learning',
        instructor: 'Dr. Geoffrey Hinton',
        credits: 4,
        department: 'Data Science',
        schedule: 'Tue / Thu 10:30 - 12:00 PM',
        capacity: 40,
        enrolledCount: 35
      },
      {
        courseCode: 'SEC350',
        courseName: 'Network Security & Cryptography',
        instructor: 'Dr. Whitfield Diffie',
        credits: 3,
        department: 'Information Tech',
        schedule: 'Wed / Fri 03:00 - 04:30 PM',
        capacity: 35,
        enrolledCount: 22
      }
    ];

    const insertedCourses = await Course.insertMany(coursesData);

    // 3. Seed Enrollments for Demo Student (CS101, CS202, CS303)
    await Enrollment.create([
      {
        student: demoStudent._id,
        course: insertedCourses[0]._id,
        attendancePercent: 96,
        grade: 'A'
      },
      {
        student: demoStudent._id,
        course: insertedCourses[1]._id,
        attendancePercent: 92,
        grade: 'A-'
      },
      {
        student: demoStudent._id,
        course: insertedCourses[2]._id,
        attendancePercent: 94,
        grade: 'A'
      }
    ]);

    // 4. Seed Announcements
    await Announcement.insertMany([
      {
        title: 'Mid-Term Examination Schedule Published',
        category: 'Exam',
        content: 'The Spring 2026 mid-term examinations schedule has been uploaded to the student portal. Review your exam room allocations.',
        postedDate: 'Today'
      },
      {
        title: 'Annual Tech Hackathon 2026 Registration Open',
        category: 'Campus',
        content: 'Form teams of 2 to 4 students for the 36-hour Campus Hackathon. Top prizes include cloud credits and summer research internships.',
        postedDate: 'Yesterday'
      },
      {
        title: 'Course Add/Drop Period Deadline: Friday',
        category: 'Academic',
        content: 'Course add/drop requests for the Spring semester close this Friday at 11:59 PM. Ensure credit load is between 12 and 18 credits.',
        postedDate: '3 days ago'
      },
      {
        title: 'Campus Cloud Lab Maintenance Window',
        category: 'Urgent',
        content: 'Server maintenance scheduled this Sunday from 02:00 AM to 06:00 AM UTC. Cloud IDE services may be intermittently offline.',
        postedDate: '4 days ago'
      }
    ]);

    console.log('[MongoDB] Successfully seeded initial demo student, courses & notices!');
  } catch (seedErr) {
    console.error('[MongoDB] Auto-seeding error:', seedErr.message);
  }
}

module.exports = { connectDB };
