CREATE TABLE IF NOT EXISTS public.oracle_conversations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid DEFAULT auth.uid() NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.oracle_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users access to own conversations" ON public.oracle_conversations;
CREATE POLICY "Allow users access to own conversations"
    ON public.oracle_conversations
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS oracle_conversations_user_updated_idx ON public.oracle_conversations(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.oracle_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id uuid NOT NULL REFERENCES public.oracle_conversations(id) ON DELETE CASCADE,
    user_id uuid DEFAULT auth.uid() NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.oracle_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users access to own messages" ON public.oracle_messages;
CREATE POLICY "Allow users access to own messages"
    ON public.oracle_messages
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS oracle_messages_conv_created_idx ON public.oracle_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS oracle_messages_user_created_idx ON public.oracle_messages(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION private.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_oracle_conversations_updated_at'
    ) THEN
        CREATE TRIGGER update_oracle_conversations_updated_at
            BEFORE UPDATE ON public.oracle_conversations
            FOR EACH ROW
            EXECUTE FUNCTION private.update_updated_at_column();
    END IF;
END;
$$;
