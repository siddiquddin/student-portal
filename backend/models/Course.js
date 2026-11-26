const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  courseCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  courseName: {
    type: String,
    required: true,
    trim: true
  },
  instructor: {
    type: String,
    required: true,
    trim: true
  },
  credits: {
    type: Number,
    required: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  schedule: {
    type: String,
    required: true
  },
  capacity: {
    type: Number,
    default: 40
  },
  enrolledCount: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('Course', courseSchema);
