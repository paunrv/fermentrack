-- Update display name for demo / owner account (run in Supabase SQL Editor).
-- Replace the email if needed.

UPDATE public.profiles p
SET full_name = 'Florencia'
FROM auth.users u
WHERE p.id = u.id
  AND u.email = 'phsho007@gmail.com';

-- Verify:
-- SELECT u.email, p.full_name FROM auth.users u JOIN public.profiles p ON p.id = u.id WHERE u.email = 'phsho007@gmail.com';
