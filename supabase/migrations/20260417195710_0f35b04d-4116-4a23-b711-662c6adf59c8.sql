
-- Enum for org member roles
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'member');

-- Organizations
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Organization members
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_org_members_org ON public.organization_members(org_id);

-- Security definer helpers (avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND org_id = _org_id
  )
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_user_id uuid, _org_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND org_id = _org_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_org_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.organization_members WHERE user_id = _user_id
$$;

-- Organizations RLS
CREATE POLICY "Members can view their organizations"
  ON public.organizations FOR SELECT
  USING (public.is_org_member(auth.uid(), id));

CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Owners can update their organization"
  ON public.organizations FOR UPDATE
  USING (public.has_org_role(auth.uid(), id, 'owner'))
  WITH CHECK (public.has_org_role(auth.uid(), id, 'owner'));

-- Organization members RLS
CREATE POLICY "Users can view memberships in their orgs"
  ON public.organization_members FOR SELECT
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Owners and admins can add members"
  ON public.organization_members FOR INSERT
  WITH CHECK (
    public.has_org_role(auth.uid(), org_id, 'owner')
    OR public.has_org_role(auth.uid(), org_id, 'admin')
  );

CREATE POLICY "Owners can remove members"
  ON public.organization_members FOR DELETE
  USING (public.has_org_role(auth.uid(), org_id, 'owner'));

-- Wipe and migrate invoices
DELETE FROM public.invoices;

ALTER TABLE public.invoices ADD COLUMN org_id uuid NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN status SET DEFAULT 'processed';
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('processed', 'flagged', 'failed'));
CREATE INDEX idx_invoices_org ON public.invoices(org_id);

-- Drop old user_id-based policies
DROP POLICY IF EXISTS "Users can create their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can update their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;

-- New org-based policies
CREATE POLICY "Org members can view invoices"
  ON public.invoices FOR SELECT
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can insert invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can update invoices"
  ON public.invoices FOR UPDATE
  USING (public.is_org_member(auth.uid(), org_id))
  WITH CHECK (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can delete invoices"
  ON public.invoices FOR DELETE
  USING (public.is_org_member(auth.uid(), org_id));

-- Audit log
CREATE TABLE public.invoice_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  invoice_number text,
  vendor_name text,
  event text NOT NULL,
  status text,
  total_amount numeric,
  currency text,
  processed_at timestamptz,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_audit_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_audit_log_org ON public.invoice_audit_log(org_id);
CREATE INDEX idx_audit_log_processed_at ON public.invoice_audit_log(processed_at DESC);

CREATE POLICY "Org members can view audit log"
  ON public.invoice_audit_log FOR SELECT
  USING (public.is_org_member(auth.uid(), org_id));

-- Update signup trigger: create profile + org + membership
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
  email_prefix text;
  org_slug text;
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);

  email_prefix := COALESCE(split_part(NEW.email, '@', 1), 'user');
  org_slug := lower(regexp_replace(email_prefix, '[^a-zA-Z0-9]+', '-', 'g'))
              || '-' || substr(NEW.id::text, 1, 8);

  INSERT INTO public.organizations (name, slug)
  VALUES (email_prefix || '''s Org', org_slug)
  RETURNING id INTO new_org_id;

  INSERT INTO public.organization_members (org_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
