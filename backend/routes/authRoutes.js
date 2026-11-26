const express = require('express');
const {
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
} = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Public auth endpoints
router.post('/register', registerStudent);
router.post('/login', loginStudent);
router.post('/demo-login', demoLogin);

// Protected student portal endpoints (JWT required)
router.get('/profile', authMiddleware, getStudentProfile);
router.get('/dashboard', authMiddleware, getStudentDashboard);
router.get('/courses', authMiddleware, getAllCourses);
router.post('/courses/enroll', authMiddleware, enrollInCourse);
router.delete('/courses/drop/:courseId', authMiddleware, dropCourse);
router.put('/profile', authMiddleware, updateStudentProfile);
router.get('/announcements', getAnnouncements);

module.exports = router;
