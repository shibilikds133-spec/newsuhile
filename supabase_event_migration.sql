-- 20260825_events.sql

CREATE TABLE public.events (
    id text PRIMARY KEY,
    name text NOT NULL,
    description text DEFAULT '',
    status text DEFAULT 'active',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    is_deleted boolean DEFAULT false
);

CREATE TABLE public.event_transactions (
    id text PRIMARY KEY,
    event_id text NOT NULL REFERENCES public.events(id),
    date text NOT NULL,
    type text NOT NULL,
    category text DEFAULT '',
    description text DEFAULT '',
    amount numeric NOT NULL DEFAULT 0,
    "paymentStatus" text DEFAULT 'Paid',
    "payerName" text DEFAULT '',
    "paidTo" text DEFAULT '',
    notes text DEFAULT '',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    is_deleted boolean DEFAULT false
);

-- Triggers for updated_at (assumes update_updated_at_column() exists from previous migration)
DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at 
BEFORE UPDATE ON public.events 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_event_transactions_updated_at ON public.event_transactions;
CREATE TRIGGER update_event_transactions_updated_at 
BEFORE UPDATE ON public.event_transactions 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for events" ON public.events FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.event_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for event_transactions" ON public.event_transactions FOR ALL USING (true) WITH CHECK (true);
