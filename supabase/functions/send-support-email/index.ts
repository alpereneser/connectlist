import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { SmtpClient } from "npm:smtp-client@0.4.0";

// CORS headers - Allow requests from all origins during development
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Email configuration
const SMTP_HOST = Deno.env.get('SMTP_HOST') || '';
const SMTP_PORT = parseInt(Deno.env.get('SMTP_PORT') || '587');
const SMTP_USER = Deno.env.get('SMTP_USER') || '';
const SMTP_PASSWORD = Deno.env.get('SMTP_PASSWORD') || '';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header is required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Extract and verify the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    const { email, name, subject, message } = await req.json();

    // Validate required fields
    if (!email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: 'Email, subject and message are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify email matches authenticated user
    if (email !== user.email) {
      return new Response(
        JSON.stringify({ error: 'Email does not match authenticated user' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    try {
      const client = new SmtpClient();
      
      await client.connect({
        host: SMTP_HOST,
        port: SMTP_PORT,
        tls: true,
        debug: true, // Enable debug logging
      });

      await client.authenticate({
        username: SMTP_USER,
        password: SMTP_PASSWORD,
      });

      const emailContent = `
From: ${name} <${email}>
To: ${SMTP_USER}
Subject: [Destek Talebi] ${subject}

Gönderen: ${name} (${email})

${message}
      `.trim();

      await client.send({
        from: SMTP_USER, // Use authenticated SMTP user as sender
        to: SMTP_USER,
        subject: `[Destek Talebi] ${subject}`,
        content: emailContent,
      });

      await client.close();

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: emailError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});