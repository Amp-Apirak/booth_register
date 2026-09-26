require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const apiRoutes = require('./routes/api');

const app = express();

// Behind Caddy / the k3s gateway set TRUST_PROXY=1 so req.ip is the visitor, not the proxy
if (process.env.TRUST_PROXY) {
  const hops = Number(process.env.TRUST_PROXY);
  app.set('trust proxy', Number.isInteger(hops) ? hops : process.env.TRUST_PROXY);
}

// ── Security & Utility Middlewares ──
app.use(helmet());
// CORS_ORIGIN: comma-separated allowed origins (e.g. https://event-bbk.com); unset = allow all (dev)
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : '*';
app.set('corsOrigin', corsOrigin);
app.use(cors({ origin: corsOrigin }));
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
