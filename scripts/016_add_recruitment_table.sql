-- Create candidates table for recruitment management
CREATE TABLE IF NOT EXISTS candidates (
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
    cv_base64 TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'REVIEWED', 'INTERVIEW_SCHEDULED', 'INTERVIEWED', 'ACCEPTED', 'REJECTED')),
    ai_summary TEXT,
    ai_score INTEGER CHECK (ai_score >= 0 AND ai_score <= 100)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_position ON candidates(position);
CREATE INDEX IF NOT EXISTS idx_candidates_created_at ON candidates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);

-- Add RLS policies
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- Policy: Only managers can access candidates
CREATE POLICY "Only managers can access candidates" ON candidates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            JOIN user_profiles ON auth.users.id = user_profiles.id 
            WHERE user_profiles.role = 'manager'
        )
    );

-- Policy: Only managers can insert candidates
CREATE POLICY "Only managers can insert candidates" ON candidates
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            JOIN user_profiles ON auth.users.id = user_profiles.id 
            WHERE user_profiles.role = 'manager'
        )
    );

-- Policy: Only managers can update candidates
CREATE POLICY "Only managers can update candidates" ON candidates
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            JOIN user_profiles ON auth.users.id = user_profiles.id 
            WHERE user_profiles.role = 'manager'
        )
    );

-- Policy: Only managers can delete candidates
CREATE POLICY "Only managers can delete candidates" ON candidates
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            JOIN user_profiles ON auth.users.id = user_profiles.id 
            WHERE user_profiles.role = 'manager'
        )
    );
