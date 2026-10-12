CREATE OR REPLACE FUNCTION public.require_business_document()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF NEW.role='wholesale' AND NOT EXISTS (
 SELECT 1 FROM public.business_documents b WHERE b.user_id=NEW.id
 AND nullif(trim(b.file_path),'') IS NOT NULL
 AND b.file_path LIKE NEW.id::text || '/%'
 AND length(trim(b.business_number))>=3
 AND b.business_number=NEW.business_number
 ) THEN
   IF TG_OP='UPDATE' THEN
     IF OLD.role='wholesale' AND NEW.business_number IS DISTINCT FROM OLD.business_number THEN
       NEW.role='customer';
       RETURN NEW;
     END IF;
     -- Only the trusted server may approve without evidence. Server actions
     -- authenticate the administrator and restrict member-management staff.
     IF current_user='service_role' THEN RETURN NEW; END IF;
   END IF;
   RAISE EXCEPTION 'Business evidence is required for business membership' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.require_business_document() FROM PUBLIC,anon,authenticated;
