-- Migration: 017_fix_admin_password_correct
-- Description: Fix admin user password hash with proper escaping
-- Created: 2025-09-22

-- Update admin user password hash to bcrypt hash of 'admin' using proper PostgreSQL syntax
UPDATE users 
SET password_hash = '$2a$10$EgduKhY6.IILNytQ0Ooes.Pdpxy.MZkBuLsEUnkMfXKGXv7sNAJ9e'
WHERE email = 'admin@gmail.com' AND username = 'admin';