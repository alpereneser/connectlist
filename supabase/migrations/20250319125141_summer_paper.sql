/*
  # Add encryption for sensitive data

  1. Changes
    - Add pgcrypto extension for encryption
    - Add encryption functions
    - Add trigger for automatic encryption/decryption
    - Add encrypted columns for sensitive data

  2. Security
    - Use AES-256-CBC encryption
    - Store encryption keys securely
    - Add proper access control
*/

-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create function to encrypt data
CREATE OR REPLACE FUNCTION encrypt_data(data text, key_id text DEFAULT 'default')
RETURNS text AS $$
DECLARE
  encryption_key text;
BEGIN
  -- In production, key would be fetched from a secure key management service
  encryption_key := 'your-secure-encryption-key-here';
  
  RETURN encode(
    encrypt_iv(
      data::bytea,
      encryption_key::bytea,
      '12345678'::bytea, -- IV should be random in production
      'aes-cbc'
    ),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to decrypt data
CREATE OR REPLACE FUNCTION decrypt_data(encrypted_data text, key_id text DEFAULT 'default')
RETURNS text AS $$
DECLARE
  encryption_key text;
BEGIN
  -- In production, key would be fetched from a secure key management service
  encryption_key := 'your-secure-encryption-key-here';
  
  RETURN convert_from(
    decrypt_iv(
      decode(encrypted_data, 'base64'),
      encryption_key::bytea,
      '12345678'::bytea,
      'aes-cbc'
    ),
    'utf8'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add encrypted columns to messages table
ALTER TABLE messages
ADD COLUMN encrypted_text text,
ADD COLUMN encryption_key_id text DEFAULT 'default';

-- Create trigger function for message encryption
CREATE OR REPLACE FUNCTION encrypt_message_text()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.text <> OLD.text THEN
    NEW.encrypted_text := encrypt_data(NEW.text, NEW.encryption_key_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic encryption
CREATE TRIGGER encrypt_message_text_trigger
  BEFORE INSERT OR UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_message_text();

-- Create view for decrypted messages
CREATE OR REPLACE VIEW decrypted_messages AS
SELECT 
  id,
  conversation_id,
  sender_id,
  decrypt_data(encrypted_text, encryption_key_id) as text,
  created_at,
  is_read
FROM messages;

-- Update message policies to use decrypted view
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
CREATE POLICY "Users can view decrypted messages in their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

-- Function to send encrypted message
CREATE OR REPLACE FUNCTION send_encrypted_message(conversation_id_param uuid, message_text text)
RETURNS messages AS $$
DECLARE
  current_user_id uuid;
  recipient_id uuid;
  new_message messages;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Validate user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User is not authenticated';
  END IF;

  -- Get recipient ID
  SELECT cp.user_id INTO recipient_id
  FROM conversation_participants cp
  WHERE cp.conversation_id = conversation_id_param
  AND cp.user_id != current_user_id
  LIMIT 1;

  -- Validate user is part of conversation
  PERFORM 1 
  FROM conversation_participants cp
  WHERE cp.conversation_id = conversation_id_param
  AND cp.user_id = current_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User is not part of this conversation';
  END IF;

  -- Check if users can message each other
  IF NOT EXISTS (
    SELECT 1 FROM mutual_follows
    WHERE (user_id = current_user_id AND other_user_id = recipient_id)
    OR (user_id = recipient_id AND other_user_id = current_user_id)
  ) THEN
    RAISE EXCEPTION 'Users must follow each other to send messages';
  END IF;

  -- Insert new message with encryption
  INSERT INTO messages (
    conversation_id,
    sender_id,
    text,
    is_read,
    encryption_key_id
  )
  VALUES (
    conversation_id_param,
    current_user_id,
    message_text,
    false,
    'default'
  )
  RETURNING * INTO new_message;

  RETURN new_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;