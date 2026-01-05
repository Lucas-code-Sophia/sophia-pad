-- Create candidates table for recruitment management
CREATE TABLE IF NOT EXISTS applicants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    position TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    notes TEXT DEFAULT '',
    cv_file_name TEXT DEFAULT '',
    cv_file_path TEXT DEFAULT '',  -- Chemin dans Supabase Storage
    status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'REVIEWED', 'INTERVIEW_SCHEDULED', 'INTERVIEWED', 'ACCEPTED', 'REJECTED')),
    ai_summary TEXT,
    ai_score INTEGER CHECK (ai_score >= 0 AND ai_score <= 100)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_applicants_status ON applicants(status);
CREATE INDEX IF NOT EXISTS idx_applicants_position ON applicants(position);
CREATE INDEX IF NOT EXISTS idx_applicants_created_at ON applicants(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applicants_email ON applicants(email);

-- Add RLS policies
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;

-- Policy: Only managers can access applicants
CREATE POLICY "Only managers can access applicants" ON applicants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            JOIN user_profiles ON auth.users.id = user_profiles.id 
            WHERE user_profiles.role = 'manager'
        )
    );

-- Policy: Only managers can insert applicants
CREATE POLICY "Only managers can insert applicants" ON applicants
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            JOIN user_profiles ON auth.users.id = user_profiles.id 
            WHERE user_profiles.role = 'manager'
        )
    );

-- Policy: Only managers can update applicants
CREATE POLICY "Only managers can update applicants" ON applicants
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            JOIN user_profiles ON auth.users.id = user_profiles.id 
            WHERE user_profiles.role = 'manager'
        )
    );

-- Policy: Only managers can delete applicants
CREATE POLICY "Only managers can delete applicants" ON applicants
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            JOIN user_profiles ON auth.users.id = user_profiles.id 
            WHERE user_profiles.role = 'manager'
        )
    );
