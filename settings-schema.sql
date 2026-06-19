-- Settings Table for System Configuration
DROP TABLE IF EXISTS system_settings CASCADE;

CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_notifications BOOLEAN DEFAULT true,
  audit_logging BOOLEAN DEFAULT true,
  two_factor_auth BOOLEAN DEFAULT false,
  maintenance_mode BOOLEAN DEFAULT false,
  public_registration BOOLEAN DEFAULT true,
  auto_backup BOOLEAN DEFAULT true,
  allow_guest_login BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Ensure only one row exists (Singleton pattern)
INSERT INTO system_settings (id, email_notifications, audit_logging, two_factor_auth, maintenance_mode, public_registration, auto_backup, allow_guest_login)
SELECT '00000000-0000-0000-0000-000000000001', true, true, false, false, true, true, true
WHERE NOT EXISTS (SELECT 1 FROM system_settings);

-- RLS Policies for system_settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON system_settings
  FOR SELECT USING (true);

CREATE POLICY "Enable update for super_admins" ON system_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
  );
