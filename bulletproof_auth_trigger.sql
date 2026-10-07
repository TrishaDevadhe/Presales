-- =============================================
-- FIX: Safe User Creation Trigger
-- Run this in Supabase SQL Editor
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_full_name text;
  v_role text;
BEGIN
  -- Safely extract full_name
  IF NEW.raw_user_meta_data IS NOT NULL AND NEW.raw_user_meta_data->>'full_name' IS NOT NULL THEN
    v_full_name := NEW.raw_user_meta_data->>'full_name';
  ELSIF NEW.email IS NOT NULL AND NEW.email != '' THEN
    v_full_name := split_part(NEW.email, '@', 1);
  ELSE
    v_full_name := 'AutoDev User';
  END IF;

  -- Safely extract role
  IF NEW.raw_user_meta_data IS NOT NULL AND NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    v_role := NEW.raw_user_meta_data->>'role';
  ELSE
    v_role := 'Design Engineer';
  END IF;

  -- Insert with guaranteed non-null values
  INSERT INTO public.users (id, full_name, email, role)
  VALUES (
    NEW.id,
    v_full_name,
    COALESCE(NEW.email, 'no-email-' || NEW.id || '@autodev.internal'),
    v_role
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Fallback if the above insert completely fails for any unknown constraint 
  -- so that the Auth user can still be created without rolling back.
  RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach the trigger safely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
