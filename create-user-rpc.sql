-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create an RPC to create users securely without the service_role key
CREATE OR REPLACE FUNCTION create_user_admin(
    user_email TEXT,
    user_password TEXT,
    user_full_name TEXT,
    user_role TEXT,
    user_department TEXT,
    user_is_active BOOLEAN
) RETURNS json AS $$
DECLARE
    new_user_id UUID;
    encrypted_pw TEXT;
BEGIN
    -- 1. Security Check: Only allow superadmins
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only superadmins can create users';
    END IF;

    -- 2. Encrypt password
    encrypted_pw := crypt(user_password, gen_salt('bf'));
    new_user_id := gen_random_uuid();

    -- 3. Insert into auth.users
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        new_user_id,
        'authenticated',
        'authenticated',
        user_email,
        encrypted_pw,
        now(),
        '{"provider":"email","providers":["email"]}',
        json_build_object('full_name', user_full_name),
        now(),
        now(),
        '',
        '',
        '',
        ''
    );

    -- 4. Insert into auth.identities
    INSERT INTO auth.identities (
        id,
        user_id,
        provider_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        new_user_id,
        new_user_id::text,
        format('{"sub":"%s","email":"%s"}', new_user_id::text, user_email)::jsonb,
        'email',
        now(),
        now(),
        now()
    );

    -- 5. Update the public.users profile 
    -- (The profile is created automatically by the handle_new_user trigger in Supabase)
    -- We wait a tiny bit to ensure the trigger has finished
    PERFORM pg_sleep(0.1);
    
    UPDATE public.users 
    SET role = user_role, 
        department = user_department,
        is_active = user_is_active
    WHERE id = new_user_id;

    RETURN json_build_object('id', new_user_id, 'email', user_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
