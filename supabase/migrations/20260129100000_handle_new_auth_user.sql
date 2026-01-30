-- Auto-create public.users row when a new auth.users row is inserted.
-- The profile screen can still update display_name; this ensures fetchProfile() finds a row.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  display_name_val TEXT;
BEGIN
  -- Use display_name from metadata if present and valid (2-50 chars), else 'User'
  display_name_val := TRIM(COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
  IF display_name_val = '' OR char_length(display_name_val) < 2 OR char_length(display_name_val) > 50 THEN
    display_name_val := 'User';
  ELSE
    display_name_val := SUBSTRING(display_name_val FROM 1 FOR 50);
  END IF;

  INSERT INTO public.users (id, email, phone, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    display_name_val
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger on auth.users (Supabase Auth)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
