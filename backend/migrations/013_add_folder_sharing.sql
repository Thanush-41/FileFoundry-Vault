-- Migration: Add folder sharing support
-- Date: 2025-09-19

-- Create folder_shares table for internal user folder sharing
CREATE TABLE IF NOT EXISTS folder_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    shared_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_with UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(20) NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create folder_share_links table for external folder sharing
CREATE TABLE IF NOT EXISTS folder_share_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- Optional password protection
    permission VARCHAR(20) NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'download')),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    max_downloads INTEGER,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create folder_share_link_access_logs table for tracking access
CREATE TABLE IF NOT EXISTS folder_share_link_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    share_link_id UUID NOT NULL REFERENCES folder_share_links(id) ON DELETE CASCADE,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    action VARCHAR(50) NOT NULL -- 'view', 'download', etc.
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_folder_shares_folder_id ON folder_shares(folder_id);
CREATE INDEX IF NOT EXISTS idx_folder_shares_shared_by ON folder_shares(shared_by);
CREATE INDEX IF NOT EXISTS idx_folder_shares_shared_with ON folder_shares(shared_with);
CREATE INDEX IF NOT EXISTS idx_folder_shares_deleted_at ON folder_shares(deleted_at);

CREATE INDEX IF NOT EXISTS idx_folder_share_links_folder_id ON folder_share_links(folder_id);
CREATE INDEX IF NOT EXISTS idx_folder_share_links_created_by ON folder_share_links(created_by);
CREATE INDEX IF NOT EXISTS idx_folder_share_links_token ON folder_share_links(token);
CREATE INDEX IF NOT EXISTS idx_folder_share_links_deleted_at ON folder_share_links(deleted_at);

CREATE INDEX IF NOT EXISTS idx_folder_share_link_access_logs_share_link_id ON folder_share_link_access_logs(share_link_id);
CREATE INDEX IF NOT EXISTS idx_folder_share_link_access_logs_accessed_at ON folder_share_link_access_logs(accessed_at);

-- Add unique constraint to prevent duplicate folder shares between same users
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_folder_share 
ON folder_shares(folder_id, shared_by, shared_with) 
WHERE deleted_at IS NULL;