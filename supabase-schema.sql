-- Liceo Cares Feedback Management System
-- Supabase Database Schema
-- 
-- NOTE: In the UI, "complaints" are now referred to as "feedback", 
-- but the underlying database tables and columns retain the "complaint" naming convention.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (for Admin and Department Officers)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'department')),
  department TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Complaints table
CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  student_id TEXT,
  category TEXT NOT NULL CHECK (category IN ('academic', 'facilities', 'finance', 'staff', 'security', 'other')),
  description TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT FALSE,
  attachment_url TEXT,
  resolution_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'verified', 'rejected', 'in_progress', 'resolved')),
  assigned_department TEXT,
  admin_remarks TEXT,
  department_remarks TEXT,
  resolution_details TEXT,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  started_by UUID REFERENCES users(id),
  started_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit trail table
CREATE TABLE IF NOT EXISTS audit_trail (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES users(id),
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_complaints_reference ON complaints(reference_number);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_department ON complaints(assigned_department);
CREATE INDEX IF NOT EXISTS idx_complaints_created ON complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_complaint ON audit_trail(complaint_id);

-- Sample admin user (run this after creating the user in Supabase Auth)
-- Replace 'YOUR_ADMIN_USER_ID' with the actual UUID from auth.users
-- INSERT INTO users (id, email, role, full_name)
-- VALUES ('YOUR_ADMIN_USER_ID', 'admin@liceo.edu.ph', 'admin', 'VP Admin');

-- Sample department user
-- INSERT INTO users (id, email, role, department, full_name)
-- VALUES ('YOUR_DEPT_USER_ID', 'academic@liceo.edu.ph', 'department', 'academic', 'Academic Affairs Officer');
