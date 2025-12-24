-- Update users table to support 6-digit PIN codes
-- This script updates the PIN column to VARCHAR(6) and updates existing PINs

-- First, update the column type
ALTER TABLE users ALTER COLUMN pin TYPE VARCHAR(6);

-- Note: You'll need to manually update existing user PINs to 6 digits
-- Example: UPDATE users SET pin = '123456' WHERE id = 1;

-- Add a comment to the column
COMMENT ON COLUMN users.pin IS '6-digit PIN code for user authentication';
