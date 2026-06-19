-- =====================================================
-- SUPER ADMIN FEATURES DATABASE SCHEMA
-- Run this SQL in your Supabase SQL Editor
-- 
-- NOTE: In the UI, "complaints" are now referred to as "feedback", 
-- but the underlying database tables and columns retain the "complaint" naming convention.
-- =====================================================

-- 1. Update users table to include super_admin role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'department', 'super_admin'));

-- 2. Update departments table for managing departments
ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS head_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS head_email VARCHAR(255);

-- Insert default departments
INSERT INTO departments (name, code, description, is_active) VALUES
  ('Academic Affairs', 'academic', 'Handles academic-related concerns and inquiries', TRUE),
  ('Facilities Management', 'facilities', 'Manages campus facilities and maintenance', TRUE),
  ('Finance Office', 'finance', 'Handles financial matters and billing concerns', TRUE),
  ('Human Resources', 'hr', 'Manages employee and staff-related concerns', TRUE),
  ('Security Office', 'security', 'Handles security and safety concerns', TRUE),
  ('Registrar', 'registrar', 'Manages student records and registration', TRUE),
  ('Student Affairs', 'student_affairs', 'Handles student welfare and activities', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 3. Create login_sessions table for tracking logins
CREATE TABLE IF NOT EXISTS login_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_type VARCHAR(50),
  browser VARCHAR(100),
  os VARCHAR(100),
  location_country VARCHAR(100),
  location_city VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  logged_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  logged_out_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for login_sessions
CREATE INDEX IF NOT EXISTS idx_login_sessions_user ON login_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_login_sessions_ip ON login_sessions(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_sessions_logged_in ON login_sessions(logged_in_at DESC);

-- 4. Create complaint_submissions table for tracking IP submissions
CREATE TABLE IF NOT EXISTS complaint_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  device_type VARCHAR(50),
  browser VARCHAR(100),
  os VARCHAR(100),
  fingerprint VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for complaint_submissions
CREATE INDEX IF NOT EXISTS idx_complaint_submissions_ip ON complaint_submissions(ip_address);
CREATE INDEX IF NOT EXISTS idx_complaint_submissions_created ON complaint_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaint_submissions_complaint ON complaint_submissions(complaint_id);

-- 5. Create rate_limit_settings table
CREATE TABLE IF NOT EXISTS rate_limit_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value INTEGER NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT TRUE,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default rate limit settings
INSERT INTO rate_limit_settings (setting_key, setting_value, description, is_enabled) VALUES
  ('tickets_per_ip_hourly', 5, 'Maximum tickets allowed per IP address per hour', TRUE),
  ('tickets_per_ip_daily', 10, 'Maximum tickets allowed per IP address per day', TRUE),
  ('tickets_per_ip_weekly', 30, 'Maximum tickets allowed per IP address per week', TRUE),
  ('tickets_per_ip_monthly', 50, 'Maximum tickets allowed per IP address per month', TRUE),
  ('tickets_per_ip_yearly', 200, 'Maximum tickets allowed per IP address per year', TRUE),
  ('global_rate_limiting', 1, 'Enable/disable global rate limiting (1=enabled, 0=disabled)', TRUE),
  ('cooldown_minutes', 30, 'Cooldown period in minutes after hitting rate limit', TRUE)
ON CONFLICT (setting_key) DO NOTHING;

-- 6. Create blocked_ips table
CREATE TABLE IF NOT EXISTS blocked_ips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address VARCHAR(45) NOT NULL UNIQUE,
  reason TEXT,
  blocked_by UUID REFERENCES users(id),
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_permanent BOOLEAN DEFAULT FALSE
);

-- Create index for blocked_ips
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_expires ON blocked_ips(expires_at);

-- 7. Create system_audit_log table for super admin actions
CREATE TABLE IF NOT EXISTS system_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action VARCHAR(255) NOT NULL,
  actor_id UUID REFERENCES users(id),
  actor_email VARCHAR(255),
  target_type VARCHAR(100),
  target_id UUID,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for system_audit_log
CREATE INDEX IF NOT EXISTS idx_system_audit_log_actor ON system_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_system_audit_log_created ON system_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_audit_log_action ON system_audit_log(action);

-- 8. Create system_settings table for general settings
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type VARCHAR(50) DEFAULT 'string',
  description TEXT,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
  ('maintenance_mode', 'false', 'boolean', 'Enable/disable maintenance mode'),
  ('allow_anonymous_complaints', 'true', 'boolean', 'Allow anonymous complaint submissions'),
  ('require_email_verification', 'false', 'boolean', 'Require email verification for complaints'),
  ('max_attachment_size_mb', '5', 'number', 'Maximum attachment size in MB'),
  ('system_name', 'Liceo Cares Feedback System', 'string', 'System display name')
ON CONFLICT (setting_key) DO NOTHING;

-- 9. Enable RLS on new tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies (allow all for authenticated users - super admin)
CREATE POLICY "Super admin full access to departments" ON departments FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Super admin full access to login_sessions" ON login_sessions FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Super admin full access to complaint_submissions" ON complaint_submissions FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Super admin full access to rate_limit_settings" ON rate_limit_settings FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Super admin full access to blocked_ips" ON blocked_ips FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Super admin full access to system_audit_log" ON system_audit_log FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Super admin full access to system_settings" ON system_settings FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- Allow public insert for complaint_submissions (for tracking submissions)
CREATE POLICY "Public can insert complaint_submissions" ON complaint_submissions FOR INSERT WITH CHECK (TRUE);

-- 11. Create function to check rate limits
CREATE OR REPLACE FUNCTION check_ip_rate_limit(check_ip VARCHAR(45), period VARCHAR(20))
RETURNS TABLE(is_limited BOOLEAN, current_count INTEGER, limit_value INTEGER) AS $$
DECLARE
  period_start TIMESTAMP WITH TIME ZONE;
  limit_setting INTEGER;
  submission_count INTEGER;
BEGIN
  -- Get the period start time
  CASE period
    WHEN 'hourly' THEN period_start := NOW() - INTERVAL '1 hour';
    WHEN 'daily' THEN period_start := NOW() - INTERVAL '1 day';
    WHEN 'weekly' THEN period_start := NOW() - INTERVAL '1 week';
    WHEN 'monthly' THEN period_start := NOW() - INTERVAL '1 month';
    WHEN 'yearly' THEN period_start := NOW() - INTERVAL '1 year';
    ELSE period_start := NOW() - INTERVAL '1 day';
  END CASE;
  
  -- Get the limit setting
  SELECT setting_value INTO limit_setting 
  FROM rate_limit_settings 
  WHERE setting_key = 'tickets_per_ip_' || period AND is_enabled = TRUE;
  
  IF limit_setting IS NULL THEN
    limit_setting := 999999; -- No limit if setting not found
  END IF;
  
  -- Count submissions in period
  SELECT COUNT(*) INTO submission_count
  FROM complaint_submissions
  WHERE ip_address = check_ip AND created_at >= period_start;
  
  RETURN QUERY SELECT submission_count >= limit_setting, submission_count, limit_setting;
END;
$$ LANGUAGE plpgsql;

-- 12. Create trigger to update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to new tables
DROP TRIGGER IF EXISTS update_departments_updated_at ON departments;
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rate_limit_settings_updated_at ON rate_limit_settings;
CREATE TRIGGER update_rate_limit_settings_updated_at BEFORE UPDATE ON rate_limit_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICATION QUERIES (uncomment to test)
-- =====================================================
-- SELECT * FROM departments;
-- SELECT * FROM rate_limit_settings;
-- SELECT * FROM system_settings;
-- SELECT check_ip_rate_limit('127.0.0.1', 'daily');
