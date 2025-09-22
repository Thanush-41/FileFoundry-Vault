-- Update audit_logs table to match the new schema
-- This migration updates the existing audit_logs table to the new format

-- Add missing columns
ALTER TABLE audit_logs 
    ADD COLUMN IF NOT EXISTS resource_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS details JSONB,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'success',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Drop old columns that are no longer needed
ALTER TABLE audit_logs 
    DROP COLUMN IF EXISTS old_values,
    DROP COLUMN IF EXISTS new_values;

-- Update user_id to be NOT NULL and add proper foreign key constraint
ALTER TABLE audit_logs 
    ALTER COLUMN user_id SET NOT NULL;

-- Drop existing foreign key constraint and recreate with CASCADE
ALTER TABLE audit_logs 
    DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

ALTER TABLE audit_logs 
    ADD CONSTRAINT audit_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Add trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_audit_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_audit_logs_updated_at ON audit_logs;
CREATE TRIGGER update_audit_logs_updated_at
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_logs_updated_at();

-- Clear existing data and add sample data with new schema
DELETE FROM audit_logs;

-- Add some sample audit log entries for testing
INSERT INTO audit_logs (user_id, action, resource_type, resource_id, resource_name, details, ip_address, user_agent, status) VALUES
    (
        (SELECT id FROM users WHERE email = 'thanush@gmail.com' LIMIT 1),
        'upload',
        'file',
        (SELECT id FROM files LIMIT 1),
        'sample-document.pdf',
        '{"file_size": 1048576, "mime_type": "application/pdf", "upload_duration_ms": 2500}',
        '127.0.0.1',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'success'
    ),
    (
        (SELECT id FROM users WHERE email = 'admin@gmail.com' LIMIT 1),
        'download',
        'file',
        (SELECT id FROM files LIMIT 1),
        'sample-document.pdf',
        '{"download_size": 1048576, "download_duration_ms": 850}',
        '192.168.1.100',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'success'
    );