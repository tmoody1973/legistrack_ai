-- Delete existing policies first
DROP POLICY IF EXISTS "Users can manage own profile" ON users;
DROP POLICY IF EXISTS "Service role full access" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Allow authenticated users" ON users;

-- Create more permissive policies for testing
CREATE POLICY "Allow authenticated users" ON users
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add service role policy for server-side operations
CREATE POLICY "Service role full access" ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add a comment explaining the policy change
COMMENT ON TABLE users IS 'User profiles with permissive RLS policies for testing.
The handle_new_user trigger (SECURITY DEFINER) handles insertion during signup.
For production, consider restricting policies to only allow users to access their own data.';