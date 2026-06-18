CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  otp_code VARCHAR(6) DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  phone VARCHAR(50) DEFAULT '',
  patient_record JSONB DEFAULT '{}'::jsonb,
  privacy_settings JSONB DEFAULT '{}'::jsonb,
  notifications JSONB DEFAULT '[]'::jsonb,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- We can also store public records accessed via QR code here, or just fetch directly from profiles based on a qr_id inside patient_record.
-- For this simple setup, updating a profile updates everything.
