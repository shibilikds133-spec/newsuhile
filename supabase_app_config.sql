CREATE TABLE public.app_config (
    id text PRIMARY KEY,
    value text,
    sync_status text DEFAULT 'synced'::text,
    updated_at timestamp with time zone DEFAULT now(),
    is_deleted boolean DEFAULT false
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Create policies for app_config (assuming standard authenticated or anon access based on your setup)
-- If this app is fully open or uses anon key, allow all operations:
CREATE POLICY "Enable read access for all users" ON public.app_config FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.app_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.app_config FOR UPDATE USING (true);
