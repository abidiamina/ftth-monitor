const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  console.error('CRITICAL ERROR: JWT_SECRET is not defined in environment variables.');
  process.exit(1);
}

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };