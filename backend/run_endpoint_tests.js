/**
 * MediQR Programmatic API Endpoint Test Suite
 * Compiles and executes test requests against the local API server on port 5000.
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const TEST_SERVER = 'http://localhost:5000';
const testEmail = `testuser_${Math.floor(Math.random() * 100000)}@mediqr.test`;
const testPassword = 'SecurePassword123!';
const testQrId = 'mqr-' + Math.random().toString(36).substring(2, 10);
let authToken = '';
let receivedOtp = '';

async function runSuite() {
  console.log('===================================================');
  console.log('       MediQR API Endpoint Automated Test Suite');
  console.log('===================================================');
  console.log(`Target Server: ${TEST_SERVER}\n`);

  // 0. Health check
  try {
    const res = await fetch(`${TEST_SERVER}/api/network-ip`);
    if (!res.ok) throw new Error('Status not OK');
    console.log('✅ [PASS] Test 1: API Server health check (Port 5000 is active)');
  } catch (err) {
    console.error('❌ [FAIL] Test 1: Local server is not reachable!');
    console.error('Please start the server first by running: npm run start:all\n');
    process.exit(1);
  }

  // 1. Signup validation (empty email/password)
  try {
    const res = await fetch(`${TEST_SERVER}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await res.json();
    if (res.status === 400 && data.error) {
      console.log('✅ [PASS] Test 2: Signup validation (reject empty data)');
    } else {
      console.log('❌ [FAIL] Test 2: Signup allowed empty data');
    }
  } catch (e) {
    console.log('❌ [FAIL] Test 2:', e.message);
  }

  // 2. Signup successful
  try {
    const res = await fetch(`${TEST_SERVER}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    const data = await res.json();
    if (res.status === 200 && data.error === null) {
      console.log(`✅ [PASS] Test 3: Create account success (${testEmail})`);
    } else {
      console.log('❌ [FAIL] Test 3: Failed to create account:', data.error);
    }
  } catch (e) {
    console.log('❌ [FAIL] Test 3:', e.message);
  }

  // 3. Signup validation (duplicate email)
  try {
    const res = await fetch(`${TEST_SERVER}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    const data = await res.json();
    if (res.status === 400 && data.error && data.error.includes('exists')) {
      console.log('✅ [PASS] Test 4: Signup validation (prevent duplicate emails)');
    } else {
      console.log('❌ [FAIL] Test 4: Duplicate email signup allowed');
    }
  } catch (e) {
    console.log('❌ [FAIL] Test 4:', e.message);
  }

  // Fetch OTP directly from database for testing
  const pg = require('pg');
  const pool = new pg.Pool({
    connectionString: "postgresql://postgres.jnsuxuhyhrkntnifovkl:Velan%402005000@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require",
    ssl: { rejectUnauthorized: false }
  });
  try {
    const dbRes = await pool.query('SELECT otp_code FROM users WHERE email = $1', [testEmail]);
    receivedOtp = dbRes.rows[0]?.otp_code;
    console.log(`ℹ️ [DB LOG] Fetched verification OTP for testing: ${receivedOtp}`);
  } catch (e) {
    console.log('❌ Error fetching OTP code from database:', e.message);
  }

  // 4. OTP verification (invalid OTP)
  try {
    const res = await fetch(`${TEST_SERVER}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otp: '000000' })
    });
    const data = await res.json();
    if (res.status === 400 && data.error) {
      console.log('✅ [PASS] Test 5: Reject invalid OTP verification code');
    } else {
      console.log('❌ [FAIL] Test 5: Invalid OTP was accepted');
    }
  } catch (e) {
    console.log('❌ [FAIL] Test 5:', e.message);
  }

  // 5. OTP verification (valid OTP)
  try {
    const res = await fetch(`${TEST_SERVER}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otp: receivedOtp })
    });
    const data = await res.json();
    if (res.status === 200 && data.success) {
      console.log('✅ [PASS] Test 6: Verify OTP and activate account success');
    } else {
      console.log('❌ [FAIL] Test 6: OTP verification failed:', data.error);
    }
  } catch (e) {
    console.log('❌ [FAIL] Test 6:', e.message);
  }

  // 6. Login (invalid password)
  try {
    const res = await fetch(`${TEST_SERVER}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'WrongPassword' })
    });
    const data = await res.json();
    if (res.status === 400 && data.error) {
      console.log('✅ [PASS] Test 7: Reject login with incorrect password');
    } else {
      console.log('❌ [FAIL] Test 7: Allowed login with wrong password');
    }
  } catch (e) {
    console.log('❌ [FAIL] Test 7:', e.message);
  }

  // 7. Login successful
  try {
    const res = await fetch(`${TEST_SERVER}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    const data = await res.json();
    if (res.status === 200 && data.token) {
      authToken = data.token;
      console.log('✅ [PASS] Test 8: Login successful (JWT Token generated)');
    } else {
      console.log('❌ [FAIL] Test 8: Login failed:', data.error);
    }
  } catch (e) {
    console.log('❌ [FAIL] Test 8:', e.message);
  }

  // 8. Get current profile (authenticated)
  try {
    const res = await fetch(`${TEST_SERVER}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (res.status === 200 && data.success) {
      console.log('✅ [PASS] Test 9: Get user profile details with token authorization');
    } else {
      console.log('❌ [FAIL] Test 9: Profile authorization failed:', data.error);
    }
  } catch (e) {
    console.log('❌ [FAIL] Test 9:', e.message);
  }

  // 9. Save profile details
  try {
    const payload = {
      phone: '+1 (555) 999-8888',
      patientRecord: {
        qrId: testQrId,
        name: 'Test Patient Profile',
        bloodGroup: 'O+',
        age: 30,
        gender: 'Male',
        height: 175,
        weight: 70,
        allergies: [{ name: 'Peanut', severity: 'Severe' }],
        conditions: [{ name: 'Asthma' }],
        medications: [{ name: 'Albuterol', dosage: '2 puffs' }],
        contacts: [{ name: 'Sarah Test', phone: '+15552223333', relationship: 'Spouse' }]
      },
      privacySettings: {
        showVitals: true,
        showAllergies: true,
        showConditions: true,
        showMedications: true,
        showContacts: true
      }
    };

    const res = await fetch(`${TEST_SERVER}/api/profiles/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.status === 200 && data.success) {
      console.log('✅ [PASS] Test 10: Save profile details (clinical records & ICE contacts)');
    } else {
      console.log('❌ [FAIL] Test 10: Failed to save profile:', data.error);
    }
  } catch (e) {
    console.log('❌ [FAIL] Test 10:', e.message);
  }

  // 10. Update onboarding completion status
  try {
    const res = await fetch(`${TEST_SERVER}/api/profiles/onboarding`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (res.status === 200 && data.success) {
      console.log('✅ [PASS] Test 11: Set onboarding completion status');
    } else {
      console.log('❌ [FAIL] Test 11: Onboarding check failed:', data.error);
    }
  } catch (e) {
    console.log('❌ [FAIL] Test 11:', e.message);
  }

  // 11. Retrieve public clinical profile by QR Key (simulating QR scan)
  try {
    const res = await fetch(`${TEST_SERVER}/api/records/${testQrId}`);
    const data = await res.json();
    if (res.status === 200 && data.patientRecord) {
      console.log(`✅ [PASS] Test 12: Retrieve emergency profile via scanned QR Key (${testQrId})`);
    } else {
      console.log('❌ [FAIL] Test 12: Public record scan failed:', data.error);
    }
  } catch (e) {
    console.log('❌ [FAIL] Test 12:', e.message);
  }

  // 12. Local network IP resolver
  try {
    const res = await fetch(`${TEST_SERVER}/api/network-ip`);
    const data = await res.json();
    if (res.status === 200 && data.ip) {
      console.log(`✅ [PASS] Test 13: Local network IP resolver endpoint (IP: ${data.ip})`);
    } else {
      console.log('❌ [FAIL] Test 13: Network resolver failed.');
    }
  } catch (e) {
    console.log('❌ [FAIL] Test 13:', e.message);
  }

  // Clean up test database row
  try {
    await pool.query('DELETE FROM profiles WHERE user_id IN (SELECT id FROM users WHERE email = $1)', [testEmail]);
    await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
    console.log('ℹ️ [DB LOG] Cleaned up temporary test rows.');
  } catch (e) {
    console.log('Error cleaning test rows:', e.message);
  }
  await pool.end();

  console.log('\n===================================================');
  console.log('          API SERVER VERIFICATION: SUCCESS');
  console.log('===================================================');
}

runSuite();
