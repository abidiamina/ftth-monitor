const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
require('dotenv').config();

const authRoutes         = require('./routes/authRoutes');
const userRoutes         = require('./routes/userRoutes');
const interventionRoutes = require('./routes/interventionRoutes');
const clientRoutes = require('./routes/clientRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Middlewares
app.use(cors());
// Sprint 3 can send base64 payloads (photos / signatures). Keep a comfortable ceiling for dev.
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(morgan('dev'));

// Routes
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/interventions', interventionRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: '🚀 FTTH Monitor API — OK' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur interne du serveur',
  });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`✅ Backend démarré sur http://localhost:${PORT}`);
});
