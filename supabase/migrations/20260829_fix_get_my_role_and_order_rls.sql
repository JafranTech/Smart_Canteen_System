-- Fix get_my_role function and RLS policies for students viewing orders
CREATE OR REPLACE FUNCTION public.get_my_role()
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  jwt_role text;
  db_role text;
BEGIN
  jwt_role := current_setting('request.jwt.claims', true)::json->'user_metadata'->>'role';
  IF jwt_role IS NOT NULL AND jwt_role <> '' THEN
    RETURN jwt_role;
  END IF;

  SELECT role INTO db_role FROM public.profiles WHERE id = auth.uid();
  IF db_role IS NOT NULL AND db_role <> '' THEN
    RETURN db_role;
  END IF;

  RETURN 'student';
END;
$$;

DROP POLICY IF EXISTS "Students can view own orders" ON public.orders;
CREATE POLICY "Students can view own orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  auth.uid() = student_id OR get_my_role() = 'student'
);

DROP POLICY IF EXISTS "Students can view own order items" ON public.order_items;
CREATE POLICY "Students can view own order items"
ON public.order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id AND o.student_id = auth.uid()
  ) OR get_my_role() = 'student'
);
