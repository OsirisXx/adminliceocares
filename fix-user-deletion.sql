-- =====================================================
-- FIX FOREIGN KEY CONSTRAINTS FOR USER DELETION
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- 1. Fix constraints in complaints table
-- Drop existing constraints
ALTER TABLE complaints DROP CONSTRAINT IF EXISTS complaints_verified_by_fkey;
ALTER TABLE complaints DROP CONSTRAINT IF EXISTS complaints_started_by_fkey;
ALTER TABLE complaints DROP CONSTRAINT IF EXISTS complaints_resolved_by_fkey;
ALTER TABLE complaints DROP CONSTRAINT IF EXISTS complaints_assigned_to_fkey;

-- Re-add with ON DELETE SET NULL
ALTER TABLE complaints ADD CONSTRAINT complaints_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE complaints ADD CONSTRAINT complaints_started_by_fkey FOREIGN KEY (started_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE complaints ADD CONSTRAINT complaints_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE complaints ADD CONSTRAINT complaints_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Fix constraints in audit_trail table
ALTER TABLE audit_trail DROP CONSTRAINT IF EXISTS audit_trail_performed_by_fkey;
ALTER TABLE audit_trail ADD CONSTRAINT audit_trail_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL;

-- 3. Fix constraints in ticket_comments table
ALTER TABLE ticket_comments DROP CONSTRAINT IF EXISTS ticket_comments_author_id_fkey;
ALTER TABLE ticket_comments ADD CONSTRAINT ticket_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;

-- 4. Fix constraints in rate_limit_settings table
ALTER TABLE rate_limit_settings DROP CONSTRAINT IF EXISTS rate_limit_settings_updated_by_fkey;
ALTER TABLE rate_limit_settings ADD CONSTRAINT rate_limit_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- 5. Fix constraints in blocked_ips table
ALTER TABLE blocked_ips DROP CONSTRAINT IF EXISTS blocked_ips_blocked_by_fkey;
ALTER TABLE blocked_ips ADD CONSTRAINT blocked_ips_blocked_by_fkey FOREIGN KEY (blocked_by) REFERENCES users(id) ON DELETE SET NULL;

-- 6. Fix constraints in login_sessions table
ALTER TABLE login_sessions DROP CONSTRAINT IF EXISTS login_sessions_user_id_fkey;
ALTER TABLE login_sessions ADD CONSTRAINT login_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
