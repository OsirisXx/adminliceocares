-- =====================================================
-- DATABASE UPDATES FOR NOTIFICATION SYSTEM
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- 1. Create system_notifications table
CREATE TABLE IF NOT EXISTS system_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID, -- Specific user to notify (e.g., student ID or specific staff ID)
  role_target VARCHAR(50), -- Role to notify if user_id is null ('admin', 'department', 'super_admin')
  department_target VARCHAR(100), -- Specific department to notify if role is 'department'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'new_ticket', 'ticket_update', 'new_comment', 'system'
  reference_id UUID, -- ID of the related entity (complaint_id, etc.)
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for quick fetching
CREATE INDEX IF NOT EXISTS idx_system_notifications_user ON system_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_system_notifications_role ON system_notifications(role_target);
CREATE INDEX IF NOT EXISTS idx_system_notifications_dept ON system_notifications(department_target);
CREATE INDEX IF NOT EXISTS idx_system_notifications_unread ON system_notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_system_notifications_created ON system_notifications(created_at DESC);

-- Helper functions to get user details bypassing RLS
CREATE OR REPLACE FUNCTION get_auth_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role::text FROM users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_auth_user_department()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT department::text FROM users WHERE id = auth.uid();
$$;

-- 3. Enable RLS
ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;

-- 4. Create an RPC function to fetch notifications (Bulletproof bypass for RLS issues)
CREATE OR REPLACE FUNCTION get_my_notifications()
RETURNS SETOF system_notifications
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role TEXT;
  v_user_dept TEXT;
BEGIN
  -- Get user details
  SELECT role::text, department::text INTO v_user_role, v_user_dept
  FROM users 
  WHERE id = auth.uid();

  RETURN QUERY
  SELECT * FROM system_notifications
  WHERE is_read = FALSE
  AND (
    user_id = auth.uid() OR
    (role_target = v_user_role AND (department_target IS NULL OR department_target = v_user_dept)) OR
    (role_target = 'admin' AND v_user_role = 'admin') OR
    (role_target = 'super_admin' AND v_user_role = 'super_admin')
  )
  ORDER BY created_at DESC
  LIMIT 20;
END;
$$;

-- 4. Create RLS Policies
-- NOTE: We use public policies because users (students) might not exist in the 'users' table, they exist in 'students'
-- Their auth.uid() still applies.
DROP POLICY IF EXISTS "Users can view their own notifications" ON system_notifications;
CREATE POLICY "Users can view their own notifications" ON system_notifications
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (role_target = get_auth_user_role() AND 
      (department_target IS NULL OR department_target = get_auth_user_department()))
  );

DROP POLICY IF EXISTS "Users can update their own notifications" ON system_notifications;
CREATE POLICY "Users can update their own notifications" ON system_notifications
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (role_target = get_auth_user_role() AND 
      (department_target IS NULL OR department_target = get_auth_user_department()))
  );

DROP POLICY IF EXISTS "System can insert notifications" ON system_notifications;
CREATE POLICY "System can insert notifications" ON system_notifications
  FOR INSERT
  WITH CHECK (TRUE);


-- 5. Trigger: Notify admins on new ticket
CREATE OR REPLACE FUNCTION notify_new_complaint() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO system_notifications (role_target, title, message, type, reference_id)
  VALUES ('admin', 'New Ticket Submitted', 'Ticket ' || NEW.reference_number || ' has been submitted in ' || NEW.category || '.', 'new_ticket', NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_new_complaint ON complaints;
CREATE TRIGGER on_new_complaint
  AFTER INSERT ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_complaint();


-- 6. Trigger: Notify on ticket status or assignment update
CREATE OR REPLACE FUNCTION notify_complaint_update() RETURNS TRIGGER AS $$
BEGIN
  -- If status changed
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status != 'submitted' THEN
    -- Notify Student
    INSERT INTO system_notifications (user_id, title, message, type, reference_id)
    VALUES (
      NEW.user_id, 
      'Ticket ' || REPLACE(UPPER(SUBSTRING(NEW.status FROM 1 FOR 1)) || SUBSTRING(NEW.status FROM 2), '_', ' '), 
      'Your ticket ' || NEW.reference_number || ' is now ' || REPLACE(NEW.status, '_', ' ') || '.', 
      'ticket_update', 
      NEW.id
    );
  END IF;

  -- If assignment changed (department)
  IF OLD.assigned_department IS DISTINCT FROM NEW.assigned_department AND NEW.assigned_department IS NOT NULL THEN
    -- Notify Department
    INSERT INTO system_notifications (role_target, department_target, title, message, type, reference_id)
    VALUES (
      'department', 
      NEW.assigned_department, 
      'New Ticket Assigned', 
      'Ticket ' || NEW.reference_number || ' has been assigned to your department.', 
      'new_ticket', 
      NEW.id
    );
  END IF;

  -- If specific staff assigned
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    -- Notify Staff
    INSERT INTO system_notifications (user_id, title, message, type, reference_id)
    VALUES (
      NEW.assigned_to, 
      'Ticket Assigned to You', 
      'Ticket ' || NEW.reference_number || ' has been assigned directly to you.', 
      'new_ticket', 
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_complaint_update ON complaints;
CREATE TRIGGER on_complaint_update
  AFTER UPDATE ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION notify_complaint_update();


-- 7. Trigger: Notify on new comment
CREATE OR REPLACE FUNCTION notify_new_comment() RETURNS TRIGGER AS $$
DECLARE
  complaint_record RECORD;
BEGIN
  SELECT * INTO complaint_record FROM complaints WHERE id = NEW.complaint_id;
  
  IF NEW.is_internal = TRUE THEN
    -- Notify only admins and the assigned department
    INSERT INTO system_notifications (role_target, title, message, type, reference_id)
    VALUES ('admin', 'New Internal Note', 'New internal note on ticket ' || complaint_record.reference_number, 'new_comment', NEW.complaint_id);
    
    IF complaint_record.assigned_department IS NOT NULL THEN
      INSERT INTO system_notifications (role_target, department_target, title, message, type, reference_id)
      VALUES ('department', complaint_record.assigned_department, 'New Internal Note', 'New internal note on ticket ' || complaint_record.reference_number, 'new_comment', NEW.complaint_id);
    END IF;
  ELSE
    IF auth.uid() = complaint_record.user_id THEN
      -- Notify Admin and Assigned Department
      INSERT INTO system_notifications (role_target, department_target, title, message, type, reference_id)
      VALUES (
        'admin', 
        NULL, 
        'New Reply on Ticket', 
        'Student replied to ticket ' || complaint_record.reference_number, 
        'new_comment', 
        NEW.complaint_id
      );

      IF complaint_record.assigned_department IS NOT NULL THEN
        INSERT INTO system_notifications (role_target, department_target, title, message, type, reference_id)
        VALUES (
          'department', 
          complaint_record.assigned_department, 
          'New Reply on Ticket', 
          'Student replied to ticket ' || complaint_record.reference_number, 
          'new_comment', 
          NEW.complaint_id
        );
      END IF;
    ELSE
      -- Notify Student
      INSERT INTO system_notifications (user_id, title, message, type, reference_id)
      VALUES (complaint_record.user_id, 'New Reply on Ticket', 'Staff replied to your ticket ' || complaint_record.reference_number, 'new_comment', NEW.complaint_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_new_comment ON ticket_comments;
CREATE TRIGGER on_new_comment
  AFTER INSERT ON ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_comment();
