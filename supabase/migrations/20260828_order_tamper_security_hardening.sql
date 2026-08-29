-- ==============================================================================
-- Migration: Order Tamper Security Hardening (Fix 1)
-- Closes order tampering gaps via triggers and RLS policies on `orders`.
-- ==============================================================================

-- 1. BEFORE INSERT trigger on orders: Force pending status and 0 scan count for students
CREATE OR REPLACE FUNCTION trg_enforce_order_insert_defaults()
RETURNS trigger AS $$
DECLARE
  caller_role text;
BEGIN
  -- Determine role of caller
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  
  -- If caller is a student, strictly force pending status and 0 scan count
  IF caller_role = 'student' THEN
    NEW.status := 'pending';
    NEW.qr_scanned_count := 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_order_insert_defaults_trg ON public.orders;
CREATE TRIGGER enforce_order_insert_defaults_trg
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION trg_enforce_order_insert_defaults();


-- 2. BEFORE UPDATE trigger on orders: Prevent staff from modifying immutable fields
CREATE OR REPLACE FUNCTION trg_guard_order_updates()
RETURNS trigger AS $$
DECLARE
  caller_role text;
BEGIN
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();

  -- If updater is staff
  IF caller_role = 'staff' THEN
    -- Immutable columns check
    IF NEW.student_id <> OLD.student_id THEN
      RAISE EXCEPTION 'Staff cannot modify student_id on orders';
    END IF;
    IF NEW.total_amount <> OLD.total_amount THEN
      RAISE EXCEPTION 'Staff cannot modify total_amount on orders';
    END IF;
    IF NEW.qr_token IS DISTINCT FROM OLD.qr_token THEN
      RAISE EXCEPTION 'Staff cannot modify qr_token on orders';
    END IF;
    IF NEW.created_at <> OLD.created_at THEN
      RAISE EXCEPTION 'Staff cannot modify created_at on orders';
    END IF;

    -- Valid state transitions: only paid/ready -> collected is allowed
    IF NEW.status <> OLD.status THEN
      IF NOT (OLD.status IN ('paid', 'ready') AND NEW.status = 'collected') THEN
        RAISE EXCEPTION 'Invalid status transition by staff: cannot transition from % to %', OLD.status, NEW.status;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS guard_order_updates_trg ON public.orders;
CREATE TRIGGER guard_order_updates_trg
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION trg_guard_order_updates();


-- 3. Tighten RLS Policies on `orders` for student insert
DROP POLICY IF EXISTS "Students can create orders" ON public.orders;
CREATE POLICY "Students can create orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (
  (get_my_role() = 'student') AND 
  (auth.uid() = student_id) AND 
  (status = 'pending') AND 
  (qr_scanned_count = 0)
);

-- 4. Tighten RLS Policies on `orders` for staff update
DROP POLICY IF EXISTS "Staff can update order status" ON public.orders;
CREATE POLICY "Staff can update order status"
ON public.orders FOR UPDATE
TO authenticated
USING (get_my_role() = 'staff')
WITH CHECK (
  (get_my_role() = 'staff') AND
  (status IN ('paid', 'ready', 'collected'))
);
