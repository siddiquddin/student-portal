const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Announcement = require('../models/Announcement');
const { JWT_SECRET } = require('../middleware/auth');

// Helper to format student object consistently
function formatStudent(student) {
  return {
    id: student._id.toString(),
    fullName: student.fullName,
    email: student.email,
    rollNumber: student.rollNumber,
    department: student.department,
    gpa: student.gpa,
    semester: student.semester,
    status: student.status,
    avatarUrl: student.avatarUrl,
    createdAt: student.createdAt
  };
}

// 1. Student Registration
async function registerStudent(req, res) {
  try {
    const { fullName, email, rollNumber, department, password } = req.body;

    if (!fullName || !email || !rollNumber || !department || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanRoll = rollNumber.toUpperCase().trim();

    // Check existing student
    const existing = await Student.findOne({
      $or: [{ email: cleanEmail }, { rollNumber: cleanRoll }]
    });

    if (existing) {
      return res.status(409).json({ error: 'A student with this Email or Roll Number already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newStudent = await Student.create({
      fullName: fullName.trim(),
      email: cleanEmail,
      rollNumber: cleanRoll,
      department: department.trim(),
      passwordHash,
      gpa: 3.84,
      semester: 'Spring 2026',
      status: 'Active'
    });

    // Automatically enroll in starter courses if available
    const starterCourses = await Course.find().limit(2);
    if (starterCourses.length > 0) {
      for (const c of starterCourses) {
        await Enrollment.create({
          student: newStudent._id,
          course: c._id,
          attendancePercent: 95,
          grade: 'A'
        });
        await Course.findByIdAndUpdate(c._id, { $inc: { enrolledCount: 1 } });
      }
    }

    const token = jwt.sign(
      { id: newStudent._id.toString(), email: newStudent.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      message: 'Student registered successfully in MongoDB Atlas!',
      token,
      student: formatStudent(newStudent)
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Server error during registration.' });
  }
}

// 2. Student Login
async function loginStudent(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const student = await Student.findOne({ email: cleanEmail });

    if (!student) {
      return res.status(401).json({ error: 'Invalid student email or password.' });
    }

    const isMatch = await bcrypt.compare(password, student.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid student email or password.' });
    }

    const token = jwt.sign(
      { id: student._id.toString(), email: student.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      message: 'Login successful!',
      token,
      student: formatStudent(student)
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Database query failed.' });
  }
}

// 3. Quick Demo Student Login (For Interviewers & Recruiters)
async function demoLogin(req, res) {
  try {
    let student = await Student.findOne({ email: 'alex.mercer@campus.edu' });
    if (!student) {
      student = await Student.findOne();
    }

    if (!student) {
      return res.status(404).json({ error: 'No demo student found in database.' });
    }

    const token = jwt.sign(
      { id: student._id.toString(), email: student.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      message: 'Demo login successful!',
      token,
      student: formatStudent(student)
    });
  } catch (error) {
    console.error('Demo login error:', error);
    return res.status(500).json({ error: 'Server error during demo login.' });
  }
}

// 4. Get Student Dashboard Info
async function getStudentDashboard(req, res) {
  try {
    const studentId = req.user.id;
    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    // Fetch enrollments with populated course
    const enrollments = await Enrollment.find({ student: studentId }).populate('course');

    const enrolledCourses = enrollments
      .filter((e) => e.course) // filter out orphaned courses
      .map((e) => ({
        id: e.course._id.toString(),
        course_code: e.course.courseCode,
        course_name: e.course.courseName,
        instructor: e.course.instructor,
        credits: e.course.credits,
        schedule: e.course.schedule,
        department: e.course.department,
        attendance_percent: e.attendancePercent,
        grade: e.grade,
        enrolled_at: e.enrolledAt
      }));

    const totalCredits = enrolledCourses.reduce((sum, c) => sum + c.credits, 0);

    const announcementsDocs = await Announcement.find().sort({ _id: -1 }).limit(5);
    const announcements = announcementsDocs.map((a) => ({
      id: a._id.toString(),
      title: a.title,
      category: a.category,
      content: a.content,
      posted_date: a.postedDate
    }));

    return res.status(200).json({
      student: formatStudent(student),
      enrolledCourses,
      totalCredits,
      announcements
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard data.' });
  }
}

// 5. Course Catalog (Browse with enrollment status)
async function getAllCourses(req, res) {
  try {
    const studentId = req.user.id;
    const allCourses = await Course.find().sort({ courseCode: 1 });
    const studentEnrollments = await Enrollment.find({ student: studentId }).select('course');

    const enrolledIds = new Set(studentEnrollments.map((e) => e.course.toString()));

    const formatted = allCourses.map((c) => ({
      id: c._id.toString(),
      course_code: c.courseCode,
      course_name: c.courseName,
      instructor: c.instructor,
      credits: c.credits,
      department: c.department,
      schedule: c.schedule,
      capacity: c.capacity,
      enrolled_count: c.enrolledCount,
      is_enrolled: enrolledIds.has(c._id.toString()) ? 1 : 0
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Course catalog error:', error);
    return res.status(500).json({ error: 'Failed to fetch course catalog.' });
  }
}

// 6. Enroll in a Course Facility
async function enrollInCourse(req, res) {
  try {
    const studentId = req.user.id;
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: 'Course ID is required.' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    // Check if already enrolled
    const alreadyEnrolled = await Enrollment.findOne({ student: studentId, course: courseId });
    if (alreadyEnrolled) {
      return res.status(409).json({ error: 'You are already enrolled in this course.' });
    }

    // Calculate current total credits
    const enrollments = await Enrollment.find({ student: studentId }).populate('course');
    const currentCredits = enrollments.reduce((sum, e) => sum + (e.course ? e.course.credits : 0), 0);

    if (currentCredits + course.credits > 18) {
      return res.status(400).json({
        error: `Credit limit exceeded! Enrolling would total ${currentCredits + course.credits} credits (Maximum permitted: 18 credits).`
      });
    }

    if (course.enrolledCount >= course.capacity) {
      return res.status(400).json({ error: 'Course has reached maximum capacity.' });
    }

    // Create enrollment
    await Enrollment.create({
      student: studentId,
      course: courseId,
      attendancePercent: 95,
      grade: 'In Progress'
    });

    // Increment enrolled count
    await Course.findByIdAndUpdate(courseId, { $inc: { enrolledCount: 1 } });

    return res.status(201).json({
      message: `Successfully registered for ${course.courseCode} - ${course.courseName}!`,
      courseId
    });
  } catch (error) {
    console.error('Enroll error:', error);
    return res.status(500).json({ error: 'Failed to enroll in course.' });
  }
}

// 7. Drop a Course Facility
async function dropCourse(req, res) {
  try {
    const studentId = req.user.id;
    const courseId = req.params.courseId;

    const deleted = await Enrollment.findOneAndDelete({ student: studentId, course: courseId });

    if (!deleted) {
      return res.status(400).json({ error: 'Unable to drop course or not enrolled.' });
    }

    await Course.findByIdAndUpdate(courseId, { $inc: { enrolledCount: -1 } });

    return res.status(200).json({ message: 'Course successfully dropped.' });
  } catch (error) {
    console.error('Drop error:', error);
    return res.status(500).json({ error: 'Failed to drop course.' });
  }
}

// 8. Update Student Profile
async function updateStudentProfile(req, res) {
  try {
    const studentId = req.user.id;
    const { department, fullName, avatarUrl } = req.body;

    const updateFields = {};
    if (department) updateFields.department = department.trim();
    if (fullName) updateFields.fullName = fullName.trim();
    if (avatarUrl) updateFields.avatarUrl = avatarUrl.trim();

    const updated = await Student.findByIdAndUpdate(studentId, updateFields, { new: true });
    if (!updated) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    return res.status(200).json({
      message: 'Profile updated successfully!',
      student: formatStudent(updated)
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Failed to update student profile.' });
  }
}

// 9. Get Single Student Profile
async function getStudentProfile(req, res) {
  try {
    const studentId = req.user.id;
    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    return res.status(200).json({
      student: formatStudent(student)
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({ error: 'Student not found.' });
  }
}

// 10. Fetch Announcements
async function getAnnouncements(req, res) {
  try {
    const announcements = await Announcement.find().sort({ _id: -1 });
    return res.status(200).json(
      announcements.map((a) => ({
        id: a._id.toString(),
        title: a.title,
        category: a.category,
        content: a.content,
        posted_date: a.postedDate
      }))
    );
  } catch (error) {
    console.error('Announcements error:', error);
    return res.status(500).json({ error: 'Failed to load announcements.' });
  }
}

module.exports = {
  registerStudent,
  loginStudent,
  demoLogin,
  getStudentDashboard,
  getStudentProfile,
  getAllCourses,
  enrollInCourse,
  dropCourse,
  updateStudentProfile,
  getAnnouncements
};
