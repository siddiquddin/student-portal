const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  postedDate: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('Announcement', announcementSchema);
