import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Load backend/.env first (has DATABASE_URL for local dev)
dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
// Also load root .env (won't overwrite existing vars)
dotenv.config();

const { Pool } = pg;

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  if (!req.body) req.body = {};
  next();
});

// --- Database connection ---
let pool;
try {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
  });
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });
  console.log('✅ Database pool initialized.');
} catch (e) {
  console.error('Failed to initialize pg Pool. Check DATABASE_URL:', e);
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
};

// --- AUTH ENDPOINTS ---

app.post('/api/auth/signup', async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'Database connection not initialized.' });
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, is_verified) VALUES ($1, $2, TRUE) RETURNING id',
      [email, hash]
    );

    const userId = result.rows[0].id;
    await pool.query('INSERT INTO profiles (user_id) VALUES ($1)', [userId]);

    res.status(200).json({ error: null });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'Database connection not initialized.' });
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(200).json({ token, user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  if (!pool) return res.status(500).json({ success: false, error: 'Database connection not initialized.' });
  try {
    const userResult = await pool.query('SELECT id, email FROM users WHERE id = $1', [req.user.id]);
    const profileResult = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [req.user.id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Auto-create profile if missing
    if (profileResult.rows.length === 0) {
      await pool.query('INSERT INTO profiles (user_id) VALUES ($1)', [req.user.id]);
    }

    const user = userResult.rows[0];
    const profile = profileResult.rows[0] || {};

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        phone: profile.phone || '',
        patientRecord: profile.patient_record || {},
        privacySettings: profile.privacy_settings || {},
        notifications: profile.notifications || []
      }
    });
  } catch (error) {
    console.error('Auth/me error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

app.get('/api/auth/status', async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'Database connection not initialized.' });
  const email = req.query.email;
  try {
    const result = await pool.query('SELECT is_verified FROM users WHERE email = $1', [email]);
    res.status(200).json({ isVerified: result.rows[0]?.is_verified || false });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.post('/api/auth/resend', async (req, res) => {
  res.status(200).json({ error: null });
});

// --- PROFILE ENDPOINTS ---

app.put('/api/profiles/me', authenticateToken, async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'Database connection not initialized.' });
  const { phone, patientRecord, privacySettings, notifications } = req.body;
  try {
    const existing = await pool.query('SELECT user_id FROM profiles WHERE user_id = $1', [req.user.id]);
    if (existing.rows.length === 0) {
      await pool.query(
        'INSERT INTO profiles (user_id, phone, patient_record, privacy_settings, notifications) VALUES ($1,$2,$3,$4,$5)',
        [req.user.id, phone || '', patientRecord || {}, privacySettings || {}, notifications || []]
      );
    } else {
      await pool.query(
        `UPDATE profiles
         SET phone = $1, patient_record = $2, privacy_settings = $3, notifications = $4, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $5`,
        [phone || '', patientRecord || {}, privacySettings || {}, notifications || [], req.user.id]
      );
    }
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/profiles/onboarding', authenticateToken, async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'Database connection not initialized.' });
  try {
    const result = await pool.query('SELECT onboarding_complete FROM profiles WHERE user_id = $1', [req.user.id]);
    res.status(200).json({ onboardingComplete: result.rows[0]?.onboarding_complete || false });
  } catch (error) {
    console.error('Onboarding get error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/profiles/onboarding', authenticateToken, async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'Database connection not initialized.' });
  try {
    await pool.query('UPDATE profiles SET onboarding_complete = TRUE WHERE user_id = $1', [req.user.id]);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Onboarding set error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- QR / RECORDS ENDPOINTS ---

// ✅ GET — fetch emergency profile by QR ID (used by PublicEmergencyProfile page)
app.get('/api/records/:qrId', async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'Database connection not initialized.' });
  const { qrId } = req.params;
  try {
    const result = await pool.query(
      `SELECT patient_record, privacy_settings FROM profiles WHERE patient_record->>'qrId' = $1`,
      [qrId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'QR code not found' });
    }
    res.status(200).json({
      patientRecord: result.rows[0].patient_record,
      privacySettings: result.rows[0].privacy_settings,
    });
  } catch (error) {
    console.error('GET records error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST — sync QR data to database
app.post('/api/records/:qrId', async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'Database connection not initialized.' });
  const { qrId } = req.params;
  const { patientRecord, privacySettings } = req.body;

  try {
    const result = await pool.query(
      `SELECT user_id FROM profiles WHERE patient_record->>'qrId' = $1`,
      [qrId]
    );

    if (result.rows.length > 0) {
      const userId = result.rows[0].user_id;
      await pool.query(
        `UPDATE profiles SET patient_record = $1, privacy_settings = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $3`,
        [patientRecord, privacySettings, userId]
      );
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('POST records error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- Global error handler ---
app.use((err, req, res, next) => {
  console.error('Global unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// --- Start server ---
const PORT = process.env.PORT || 5000;

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  });
}

export default app;