-- This migration recalculates storage_used based on actual file sizes
-- to ensure accurate storage quota display

-- Update storage_used for all users based on actual file sizes
UPDATE users 
SET storage_used = COALESCE((
    SELECT SUM(file_hashes.size) 
    FROM files 
    JOIN file_hashes ON files.file_hash_id = file_hashes.id 
    WHERE files.owner_id = users.id 
    AND files.deleted_at IS NULL
), 0);

-- Reset storage statistics for consistency
UPDATE users 
SET 
    actual_storage_bytes = storage_used,
    total_uploaded_bytes = storage_used
WHERE id IS NOT NULL;