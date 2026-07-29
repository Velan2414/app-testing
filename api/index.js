import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend/.env first (has DATABASE_URL for local dev)
dotenv.config({ path: path.resolve(__dirname, '..', 'backend', '.env') });
// Also load root .env (won't overwrite existing vars)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const { Pool } = pg;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// --- SMTP Email setup ---
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
  auth: process.env.EMAIL_USER && process.env.EMAIL_PASS ? {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  } : undefined,
});

const sendOtpEmail = async (email, otp) => {
  const mailOptions = {
    from: `"MediQR Support" <${process.env.EMAIL_USER || 'no-reply@mediqr.com'}>`,
    to: email,
    subject: 'MediQR - OTP Verification Code',
    text: `Your email verification OTP code is: ${otp}. It will expire in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #6366f1; text-align: center; font-size: 24px; margin-bottom: 20px;">MediQR Secure Verification</h2>
        <p style="color: #334155; font-size: 16px; line-height: 1.5;">Thank you for registering. Please verify your email using the 6-digit One-Time Password (OTP) below:</p>
        <div style="background-color: #f8fafc; padding: 18px; text-align: center; border-radius: 8px; margin: 24px 0; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #4f46e5; border: 1px dashed #cbd5e1;">
          ${otp}
        </div>
        <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 24px;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
      </div>
    `,
  };

  console.log(`\n📨 [OTP EMAIL LOG] To: ${email} | Code: ${otp}`);

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      await transporter.sendMail(mailOptions);
      console.log(`✅ OTP Email successfully sent to ${email}`);
    } catch (err) {
      console.error(`❌ Failed to send OTP Email to ${email}:`, err.message);
    }
  } else {
    console.log(`⚠️ SMTP credentials not configured. Email not sent. Please set EMAIL_USER and EMAIL_PASS in your .env file to enable actual email sending.`);
  }
};

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  if (!req.body) req.body = {};
  const start = Date.now();
  const timestamp = new Date().toISOString();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const emailInfo = req.body.email ? ` | User: ${req.body.email}` : '';
    const secretInfo = req.body.secret ? ` | Admin Secret: ***` : '';
    console.log(`📡 [BACKEND API LOG] [${timestamp}] ${req.method} ${req.originalUrl || req.url} -> ${res.statusCode} (${duration}ms)${emailInfo}${secretInfo}`);
  });
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

// Auto-create activity_logs table and composite index if missing
const initDb = async () => {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created 
        ON activity_logs (user_id, created_at DESC);
    `);
    console.log('✅ activity_logs table & index initialized.');
  } catch (err) {
    console.error('Failed to initialize activity_logs table:', err.message);
  }
};
initDb();

// Helper to log server-side user activities
const logActivity = async (userId, type, title, description = '', metadata = {}) => {
  if (!pool || !userId) return;
  try {
    await pool.query(
      `INSERT INTO activity_logs (user_id, type, title, description, metadata) VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, description, JSON.stringify(metadata)]
    );
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
};

// Helper to compare profile changes and log server-side activity
const detectAndLogProfileChanges = async (userId, oldProfile, newBody) => {
  try {
    const oldRec = oldProfile?.patient_record || {};
    const newRec = newBody.patientRecord || oldRec;

    // Check Medications
    const oldMeds = oldRec.medications || [];
    const newMeds = newRec.medications || [];
    if (newMeds.length > oldMeds.length) {
      const addedMed = newMeds[newMeds.length - 1];
      const name = addedMed?.name || 'New Medication';
      await logActivity(userId, 'medication', 'Medication Added', `${name} added to current medications.`);
    } else if (newMeds.length < oldMeds.length) {
      await logActivity(userId, 'medication', 'Medication Removed', `Removed a medication from current medications.`);
    }

    // Check Allergies
    const oldAllergies = oldRec.allergies || [];
    const newAllergies = newRec.allergies || [];
    if (newAllergies.length > oldAllergies.length) {
      const addedAllergy = newAllergies[newAllergies.length - 1];
      const name = addedAllergy?.name || 'Allergy';
      await logActivity(userId, 'allergy', 'Allergy Added', `${name} added to allergies.`);
    } else if (newAllergies.length < oldAllergies.length) {
      await logActivity(userId, 'allergy', 'Allergy Removed', `Removed an allergy item.`);
    }

    // Check Conditions
    const oldConditions = oldRec.conditions || [];
    const newConditions = newRec.conditions || [];
    if (newConditions.length > oldConditions.length) {
      const addedCond = newConditions[newConditions.length - 1];
      const name = addedCond?.name || 'Condition';
      await logActivity(userId, 'condition', 'Condition Added', `${name} added to medical conditions.`);
    } else if (newConditions.length < oldConditions.length) {
      await logActivity(userId, 'condition', 'Condition Removed', `Removed a medical condition.`);
    }

    // Check Emergency Contacts
    const oldContacts = oldRec.contacts || [];
    const newContacts = newRec.contacts || [];
    if (newContacts.length > oldContacts.length) {
      const addedContact = newContacts[newContacts.length - 1];
      const name = addedContact?.name || 'Contact';
      await logActivity(userId, 'contact', 'Emergency Contact Added', `${name} added to emergency contacts.`);
    } else if (newContacts.length < oldContacts.length) {
      await logActivity(userId, 'contact', 'Emergency Contact Removed', `Removed an emergency contact.`);
    }

    // Check Documents
    const oldDocs = oldRec.documents || [];
    const newDocs = newRec.documents || [];
    if (newDocs.length > oldDocs.length) {
      const addedDoc = newDocs[0] || newDocs[newDocs.length - 1];
      const name = addedDoc?.name || 'Medical Document';
      await logActivity(userId, 'document_upload', 'Medical Report Uploaded', `${name} uploaded successfully.`);
    } else if (newDocs.length < oldDocs.length) {
      await logActivity(userId, 'document_delete', 'Medical Report Deleted', `Medical report removed from vault.`);
    }

    // Check Blood Group or general info
    if (oldRec.bloodGroup !== newRec.bloodGroup && newRec.bloodGroup) {
      await logActivity(userId, 'profile_update', 'Profile Updated', `Updated blood group to ${newRec.bloodGroup}.`);
    } else if (JSON.stringify(oldProfile?.privacy_settings) !== JSON.stringify(newBody.privacySettings) && newBody.privacySettings) {
      await logActivity(userId, 'settings', 'Settings Changed', `Updated privacy & sharing preferences.`);
    } else if (
      oldMeds.length === newMeds.length &&
      oldAllergies.length === newAllergies.length &&
      oldConditions.length === newConditions.length &&
      oldContacts.length === newContacts.length &&
      oldDocs.length === newDocs.length &&
      oldRec.bloodGroup === newRec.bloodGroup
    ) {
      await logActivity(userId, 'profile_update', 'Profile Updated', `Updated medical profile details.`);
    }
  } catch (err) {
    console.error('Error in detectAndLogProfileChanges:', err);
  }
};

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

// GET /api/activities — Fetch authenticated user's activity logs (strictly scoped by JWT)
app.get('/api/activities', authenticateToken, async (req, res) => {
  if (!pool) return res.status(500).json({ success: false, error: 'Database connection not initialized.' });
  try {
    const rawLimit = parseInt(req.query.limit || '10', 10);
    const limit = Math.min(Math.max(rawLimit, 1), 50);

    const result = await pool.query(
      `SELECT id, type, title, description, metadata, created_at AS "createdAt"
       FROM activity_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [req.user.id, limit]
    );

    res.status(200).json({ success: true, activities: result.rows });
  } catch (error) {
    console.error('Fetch activities error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

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
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const result = await pool.query(
      'INSERT INTO users (email, password_hash, is_verified, otp_code) VALUES ($1, $2, FALSE, $3) RETURNING id',
      [email, hash, otp]
    );

    const userId = result.rows[0].id;
    await pool.query('INSERT INTO profiles (user_id) VALUES ($1)', [userId]);

    // Send OTP to email
    await sendOtpEmail(email, otp);

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

    // Check if user has verified their email via OTP
    if (!user.is_verified) {
      return res.status(400).json({ error: 'EMAIL_NOT_VERIFIED' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(200).json({ token, user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- PASSWORD RESET / OTP LOGIN ENDPOINTS ---

app.post('/api/auth/send-reset-otp', async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'Database connection not initialized.' });
  const { email } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'User with this email does not exist' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await pool.query('UPDATE users SET otp_code = $1 WHERE email = $2', [otp, email]);

    // Send reset OTP email
    const mailOptions = {
      from: `"MediQR Support" <${process.env.EMAIL_USER || 'no-reply@mediqr.com'}>`,
      to: email,
      subject: 'MediQR - Password Reset / OTP Login Code',
      text: `Your password reset verification code is: ${otp}. It will expire in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #6366f1; text-align: center; font-size: 24px; margin-bottom: 20px;">MediQR Account Access</h2>
          <p style="color: #334155; font-size: 16px; line-height: 1.5;">You requested an OTP verification code to log in or reset your password. Use the code below to sign in:</p>
          <div style="background-color: #f8fafc; padding: 18px; text-align: center; border-radius: 8px; margin: 24px 0; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #4f46e5; border: 1px dashed #cbd5e1;">
            ${otp}
          </div>
          <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 24px;">This code will expire in 10 minutes. If you did not request this, please secure your account.</p>
        </div>
      `,
    };

    console.log(`\n📨 [RESET OTP EMAIL LOG] To: ${email} | Code: ${otp}`);

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await transporter.sendMail(mailOptions);
      } catch (err) {
        console.error('Failed to send Reset OTP Email:', err.message);
      }
    }

    res.status(200).json({ success: true, error: null });
  } catch (error) {
    console.error('Send reset OTP error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/auth/reset-password-login', async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'Database connection not initialized.' });
  const { email, otp, newPassword } = req.body || {};

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP code are required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    if (user.otp_code !== otp) {
      return res.status(400).json({ error: 'Invalid OTP verification code' });
    }

    // Update password if newPassword is provided
    if (newPassword) {
      const hash = await bcrypt.hash(newPassword, 10);
      await pool.query(
        'UPDATE users SET password_hash = $1, is_verified = TRUE, otp_code = NULL WHERE id = $2',
        [hash, user.id]
      );
    } else {
      // Just activate/verify and log in
      await pool.query(
        'UPDATE users SET is_verified = TRUE, otp_code = NULL WHERE id = $1',
        [user.id]
      );
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(200).json({ token, user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error('Reset password/OTP login error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'Database connection not initialized.' });
  const { email, otp } = req.body || {};

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP code are required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    if (user.otp_code !== otp) {
      return res.status(400).json({ error: 'Invalid OTP verification code' });
    }

    await pool.query(
      'UPDATE users SET is_verified = TRUE, otp_code = NULL WHERE id = $1',
      [user.id]
    );

    res.status(200).json({ success: true, error: null });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/auth/resend-otp', async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'Database connection not initialized.' });
  const { email } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await pool.query('UPDATE users SET otp_code = $1 WHERE email = $2', [otp, email]);

    await sendOtpEmail(email, otp);

    res.status(200).json({ success: true, error: null });
  } catch (error) {
    console.error('Resend OTP error:', error);
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
  const { email } = req.body || {};
  if (email) {
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await pool.query('UPDATE users SET otp_code = $1 WHERE email = $2', [otp, email]);
      await sendOtpEmail(email, otp);
    } catch (e) {
      console.error('Resend fallback error:', e);
    }
  }
  res.status(200).json({ error: null });
});

// --- PROFILE ENDPOINTS ---

app.put('/api/profiles/me', authenticateToken, async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'Database connection not initialized.' });
  const { phone, patientRecord, privacySettings, notifications } = req.body;
  try {
    const existing = await pool.query('SELECT patient_record, privacy_settings FROM profiles WHERE user_id = $1', [req.user.id]);
    const oldProfile = existing.rows[0] || null;

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

    // Server-side activity logging
    await detectAndLogProfileChanges(req.user.id, oldProfile, req.body);

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
    await logActivity(
      req.user.id,
      'profile_created',
      'Profile Created',
      'Completed profile onboarding setup.'
    );
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
      `SELECT user_id, patient_record, privacy_settings FROM profiles WHERE patient_record->>'qrId' = $1`,
      [qrId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    const ownerUserId = result.rows[0].user_id;
    if (ownerUserId) {
      // Log scan event for profile owner (even if scanner is unauthenticated)
      await logActivity(
        ownerUserId,
        'qr_scan',
        'QR Code Scanned',
        'Viewed medical profile via QR scan.'
      );
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
      `SELECT user_id, patient_record, privacy_settings FROM profiles WHERE patient_record->>'qrId' = $1`,
      [qrId]
    );

    if (result.rows.length > 0) {
      const userId = result.rows[0].user_id;
      const oldProfile = result.rows[0];

      await pool.query(
        `UPDATE profiles SET patient_record = $1, privacy_settings = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $3`,
        [patientRecord, privacySettings, userId]
      );

      // Server-side activity logging
      await detectAndLogProfileChanges(userId, oldProfile, req.body);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('POST records error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- ADMIN ENDPOINTS ---
app.post('/api/admin/users', async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'Database connection not initialized.' });
  const { secret } = req.body || {};
  const expectedSecret = process.env.ADMIN_SECRET || 'admin123';
  if (!secret || secret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized: Invalid admin secret key' });
  }

  try {
    const result = await pool.query(`
      SELECT 
        u.id AS user_id, 
        u.email, 
        p.phone, 
        p.onboarding_complete,
        p.patient_record,
        p.privacy_settings,
        p.notifications
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      ORDER BY u.email ASC;
    `);
    res.status(200).json({ success: true, users: result.rows });
  } catch (error) {
    console.error('Admin fetch users error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- NETWORK IP ENDPOINT (Dynamic Local Dev Support) ---
app.get('/api/network-ip', (req, res) => {
  const interfaces = os.networkInterfaces();
  let ipAddress = 'localhost';
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    if (iface) {
      for (let i = 0; i < iface.length; i++) {
        const alias = iface[i];
        if (alias.family === 'IPv4' && !alias.internal) {
          ipAddress = alias.address;
          break;
        }
      }
    }
    if (ipAddress !== 'localhost') break;
  }
  res.json({ ip: ipAddress });
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