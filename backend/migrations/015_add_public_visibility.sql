-- Add public visibility field to files table
ALTER TABLE files ADD COLUMN is_public BOOLEAN DEFAULT FALSE;

-- Create an index for better query performance
CREATE INDEX idx_files_is_public ON files(is_public);

-- Create a partial index for public files only
CREATE INDEX idx_files_public_active ON files(is_public, is_deleted) WHERE is_public = TRUE AND is_deleted = FALSE;