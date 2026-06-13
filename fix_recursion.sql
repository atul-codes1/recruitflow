-- Fix Infinite Recursion in Row Level Security (RLS)

-- 1. Create a secure function to fetch the user's company ID while bypassing RLS
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$;

-- 2. Create a secure function to fetch the user's role while bypassing RLS
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- 3. Drop the old recursive policies
DROP POLICY IF EXISTS "View own company" ON public.companies;
DROP POLICY IF EXISTS "View company profiles" ON public.profiles;
DROP POLICY IF EXISTS "View company jobs" ON public.jobs;
DROP POLICY IF EXISTS "Manage company jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admin view all company apps" ON public.applications;
DROP POLICY IF EXISTS "Recruiter view own apps" ON public.applications;
DROP POLICY IF EXISTS "Manage applications" ON public.applications;

-- 4. Recreate the policies using the highly performant bypass functions
CREATE POLICY "View own company" ON public.companies FOR SELECT USING (id = get_my_company_id());

CREATE POLICY "View company profiles" ON public.profiles FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "View company jobs" ON public.jobs FOR SELECT USING (company_id = get_my_company_id());
CREATE POLICY "Manage company jobs" ON public.jobs FOR ALL USING (company_id = get_my_company_id());

CREATE POLICY "Admin view all company apps" ON public.applications FOR SELECT USING (
  get_my_role() = 'admin' AND company_id = get_my_company_id()
);
CREATE POLICY "Recruiter view own apps" ON public.applications FOR SELECT USING (recruiter_id = auth.uid());

CREATE POLICY "Manage applications" ON public.applications FOR ALL USING (
  (get_my_role() = 'admin' AND company_id = get_my_company_id())
  OR recruiter_id = auth.uid()
);
