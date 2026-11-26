const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');

// 1. Student Registration
async function registerStudent(req, res) {
  const { fullName, email, rollNumber, department, password } = req.body;

  if (!fullName || !email || !rollNumber || !department || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  try {
    db.get(
      'SELECT id FROM students WHERE email = ? OR roll_number = ?',
      [email.toLowerCase().trim(), rollNumber.toUpperCase().trim()],
      async (err, existing) => {
        if (err) return res.status(500).json({ error: 'Database error checking existing student.' });
        if (existing) {
          return res.status(409).json({ error: 'A student with this Email or Roll Number already exists.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const insertQuery = `
          INSERT INTO students (full_name, email, roll_number, department, password_hash, gpa, semester, status)
          VALUES (?, ?, ?, ?, ?, 3.84, 'Spring 2026', 'Active')
        `;

        db.run(
          insertQuery,
          [fullName.trim(), email.toLowerCase().trim(), rollNumber.toUpperCase().trim(), department.trim(), passwordHash],
          function (insertErr) {
            if (insertErr) {
              return res.status(500).json({ error: 'Failed to create student account.' });
            }

            const studentId = this.lastID;
            const token = jwt.sign(
              { id: studentId, email: email.toLowerCase().trim() },
              JWT_SECRET,
              { expiresIn: '24h' }
            );

            // Automatically give 2 starter enrollments
            db.run(`INSERT OR IGNORE INTO enrollments (student_id, course_id, attendance_percent, grade) VALUES (?, 1, 95, 'A')`, [studentId]);
            db.run(`INSERT OR IGNORE INTO enrollments (student_id, course_id, attendance_percent, grade) VALUES (?, 2, 92, 'A-')`, [studentId]);

            return res.status(201).json({
              message: 'Student registered successfully!',
              token,
              student: {
                id: studentId,
                fullName: fullName.trim(),
                email: email.toLowerCase().trim(),
                rollNumber: rollNumber.toUpperCase().trim(),
                department: department.trim(),
                gpa: 3.84,
                semester: 'Spring 2026',
                status: 'Active'
              }
            });
          }
        );
      }
    );
  } catch (error) {
    return res.status(500).json({ error: 'Server error during registration.' });
  }
}

// 2. Student Login
async function loginStudent(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  db.get(
    'SELECT * FROM students WHERE email = ?',
    [email.toLowerCase().trim()],
    async (err, student) => {
      if (err) return res.status(500).json({ error: 'Database query failed.' });
      if (!student) {
        return res.status(401).json({ error: 'Invalid student email or password.' });
      }

      const isMatch = await bcrypt.compare(password, student.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid student email or password.' });
      }

      const token = jwt.sign(
        { id: student.id, email: student.email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.status(200).json({
        message: 'Login successful!',
        token,
        student: {
          id: student.id,
          fullName: student.full_name,
          email: student.email,
          rollNumber: student.roll_number,
          department: student.department,
          gpa: student.gpa,
          semester: student.semester,
          status: student.status,
          avatarUrl: student.avatar_url
        }
      });
    }
  );
}

// 3. Quick Demo Student Login (For Interviewers & Recruiters)
function demoLogin(req, res) {
  db.get('SELECT * FROM students WHERE email = ?', ['alex.mercer@campus.edu'], (err, student) => {
    if (err || !student) {
      // Fallback: grab first student
      db.get('SELECT * FROM students LIMIT 1', (err2, firstStudent) => {
        if (err2 || !firstStudent) {
          return res.status(404).json({ error: 'No demo student found.' });
        }
        sendStudentToken(firstStudent, res);
      });
      return;
    }
    sendStudentToken(student, res);
  });
}

function sendStudentToken(student, res) {
  const token = jwt.sign(
    { id: student.id, email: student.email },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return res.status(200).json({
    message: 'Demo login successful!',
    token,
    student: {
      id: student.id,
      fullName: student.full_name,
      email: student.email,
      rollNumber: student.roll_number,
      department: student.department,
      gpa: student.gpa,
      semester: student.semester,
      status: student.status,
      avatarUrl: student.avatar_url
    }
  });
}

// 4. Get Student Dashboard Info
function getStudentDashboard(req, res) {
  const studentId = req.user.id;

  db.get(
    'SELECT id, full_name, email, roll_number, department, gpa, semester, status, avatar_url, created_at FROM students WHERE id = ?',
    [studentId],
    (err, student) => {
      if (err || !student) {
        return res.status(404).json({ error: 'Student not found.' });
      }

      // Fetch enrolled courses with attendance & grade
      const enrolledQuery = `
        SELECT c.id, c.course_code, c.course_name, c.instructor, c.credits, c.schedule, c.department,
               e.attendance_percent, e.grade, e.enrolled_at
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.student_id = ?
        ORDER BY c.course_code ASC
      `;

      db.all(enrolledQuery, [studentId], (enrollErr, enrolledCourses) => {
        const totalCredits = (enrolledCourses || []).reduce((sum, c) => sum + c.credits, 0);

        // Fetch announcements
        db.all('SELECT * FROM announcements ORDER BY id DESC LIMIT 5', (annErr, notices) => {
          return res.status(200).json({
            student: {
              id: student.id,
              fullName: student.full_name,
              email: student.email,
              rollNumber: student.roll_number,
              department: student.department,
              gpa: student.gpa,
              semester: student.semester,
              status: student.status,
              avatarUrl: student.avatar_url,
              createdAt: student.created_at
            },
            enrolledCourses: enrolledCourses || [],
            totalCredits,
            announcements: notices || []
          });
        });
      });
    }
  );
}

// 5. Course Catalog (Browse with enrollment status)
function getAllCourses(req, res) {
  const studentId = req.user.id;

  const query = `
    SELECT c.*, 
           CASE WHEN e.id IS NOT NULL THEN 1 ELSE 0 END as is_enrolled
    FROM courses c
    LEFT JOIN enrollments e ON c.id = e.course_id AND e.student_id = ?
    ORDER BY c.course_code ASC
  `;

  db.all(query, [studentId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch course catalog' });
    res.json(rows);
  });
}

// 6. Enroll in a Course Facility
function enrollInCourse(req, res) {
  const studentId = req.user.id;
  const { courseId } = req.body;

  if (!courseId) return res.status(400).json({ error: 'Course ID is required.' });

  // Check current total credits
  const creditCheckQuery = `
    SELECT SUM(c.credits) as total_credits
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    WHERE e.student_id = ?
  `;

  db.get(creditCheckQuery, [studentId], (err, creditRow) => {
    const currentCredits = creditRow?.total_credits || 0;

    // Check course details
    db.get('SELECT * FROM courses WHERE id = ?', [courseId], (courseErr, course) => {
      if (courseErr || !course) return res.status(404).json({ error: 'Course not found.' });

      if (currentCredits + course.credits > 18) {
        return res.status(400).json({
          error: `Credit limit exceeded! Enrolling would total ${currentCredits + course.credits} credits (Maximum permitted: 18 credits).`
        });
      }

      if (course.enrolled_count >= course.capacity) {
        return res.status(400).json({ error: 'Course has reached maximum capacity.' });
      }

      // Insert enrollment
      db.run(
        'INSERT INTO enrollments (student_id, course_id, attendance_percent, grade) VALUES (?, ?, 95, "In Progress")',
        [studentId, courseId],
        function (enrollErr) {
          if (enrollErr) {
            return res.status(409).json({ error: 'You are already enrolled in this course.' });
          }

          // Update enrolled count
          db.run('UPDATE courses SET enrolled_count = enrolled_count + 1 WHERE id = ?', [courseId]);

          return res.status(201).json({
            message: `Successfully registered for ${course.course_code} - ${course.course_name}!`,
            courseId
          });
        }
      );
    });
  });
}

// 7. Drop a Course Facility
function dropCourse(req, res) {
  const studentId = req.user.id;
  const courseId = req.params.courseId;

  db.run(
    'DELETE FROM enrollments WHERE student_id = ? AND course_id = ?',
    [studentId, courseId],
    function (err) {
      if (err || this.changes === 0) {
        return res.status(400).json({ error: 'Unable to drop course or not enrolled.' });
      }

      db.run('UPDATE courses SET enrolled_count = MAX(0, enrolled_count - 1) WHERE id = ?', [courseId]);
      return res.status(200).json({ message: 'Course successfully dropped.' });
    }
  );
}

// 8. Update Student Profile
function updateStudentProfile(req, res) {
  const studentId = req.user.id;
  const { department, fullName, avatarUrl } = req.body;

  db.run(
    `UPDATE students SET 
       department = COALESCE(?, department), 
       full_name = COALESCE(?, full_name),
       avatar_url = COALESCE(?, avatar_url)
     WHERE id = ?`,
    [department ? department.trim() : null, fullName ? fullName.trim() : null, avatarUrl || null, studentId],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to update student profile.' });
      return res.status(200).json({ message: 'Profile updated successfully!' });
    }
  );
}

// 9. Get Single Student Profile (For AuthContext validation)
function getStudentProfile(req, res) {
  const studentId = req.user.id;
  db.get(
    'SELECT id, full_name, email, roll_number, department, gpa, semester, status, avatar_url, created_at FROM students WHERE id = ?',
    [studentId],
    (err, student) => {
      if (err || !student) {
        return res.status(404).json({ error: 'Student not found.' });
      }
      return res.status(200).json({
        student: {
          id: student.id,
          fullName: student.full_name,
          email: student.email,
          rollNumber: student.roll_number,
          department: student.department,
          gpa: student.gpa,
          semester: student.semester,
          status: student.status,
          avatarUrl: student.avatar_url,
          createdAt: student.created_at
        }
      });
    }
  );
}

// 10. Fetch Announcements
function getAnnouncements(req, res) {
  db.all('SELECT * FROM announcements ORDER BY id DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to load announcements.' });
    res.json(rows);
  });
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
