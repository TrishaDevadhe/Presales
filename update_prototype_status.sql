-- Update the prototype_builds status constraint to match the APQP process diagram

DO $$ 
BEGIN
  -- Drop the existing check constraint on status if it exists
  ALTER TABLE public.prototype_builds DROP CONSTRAINT IF EXISTS prototype_builds_status_check;
  
  -- Add the new constraint with Sub-Assembly and Final Assembly
  ALTER TABLE public.prototype_builds ADD CONSTRAINT prototype_builds_status_check 
  CHECK (status IN ('Planning', 'Parts Sourcing', 'Sub-Assembly', 'Final Assembly', 'Inspection', 'Complete', 'Planned'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating constraint: %', SQLERRM;
END $$;

-- Update any existing 'Assembly' records to 'Sub-Assembly' to avoid violating the new constraint
UPDATE public.prototype_builds SET status = 'Sub-Assembly' WHERE status = 'Assembly';
