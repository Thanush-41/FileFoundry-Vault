-- Update user storage quotas to 10MB for regular users
-- This migration sets all regular users to 10MB storage quota while keeping admin users with higher quotas

-- Update regular users to 10MB (10,485,760 bytes)
UPDATE users 
SET storage_quota = 10485760  -- 10MB for regular users
WHERE role = 'user' OR role IS NULL OR role = '';

-- Keep admin users with 100GB quota (or set if they don't have one)
UPDATE users 
SET storage_quota = 107374182400  -- 100GB for admin users
WHERE role = 'admin' AND (storage_quota < 107374182400 OR storage_quota IS NULL);

-- Ensure all users have a valid storage quota (fallback to 10MB)
UPDATE users 
SET storage_quota = 10485760  -- 10MB fallback
WHERE storage_quota IS NULL OR storage_quota = 0;