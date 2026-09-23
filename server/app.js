require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const apiRoutes = require('./routes/api');

const app = express();

// ── Security & Utility Middlewares ──
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Health Check Endpoint (ISO 9002 Verification Point) ──
app.get('/api/v1/ping', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Smart Event Registration API',
    version: '1.0.0'
  });
});

// ── Mount API Routes under /api/v1 ──
app.use('/api/v1', apiRoutes);

module.exports = app;
