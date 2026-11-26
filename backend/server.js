const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = 4005;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', service: 'Student Portal API', time: new Date() });
});

app.listen(PORT, () => {
  console.log(`Student Portal backend running on http://localhost:${PORT}`);
});
