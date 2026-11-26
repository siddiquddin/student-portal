const jwt = require('jsonwebtoken');

// Secret key used to sign and verify tokens (in production, use process.env.JWT_SECRET)
const JWT_SECRET = 'student_portal_secret_key_2026_super_secure';

function authMiddleware(req, res, next) {
  // 1. Get the Authorization header (Format: "Bearer <token>")
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access denied. Invalid token format.' });
  }

  try {
    // 2. Verify the digital signature of the token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 3. Attach student payload to req.user for downstream route handlers
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token. Please log in again.' });
  }
}

module.exports = { authMiddleware, JWT_SECRET };
