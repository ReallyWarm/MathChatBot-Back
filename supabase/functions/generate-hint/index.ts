// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from './cors.ts';
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('No authorization header', {
      status: 401,
      headers: corsHeaders
    });
  }
  const supabaseUser = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'), {
    global: {
      headers: {
        Authorization: authHeader
      }
    }
  });
  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  try {
    const { question_id } = await req.json();
    // N8N_HINTS_TEST_WEBHOOK_URL
    const n8nWebhookUrl = Deno.env.get('N8N_HINTS_WEBHOOK_URL');
    // Check error
    if (!question_id) {
      throw new Error('Question id is required');
    }
    if (!n8nWebhookUrl) {
      throw new Error(`No webhook URL configured`);
    }
    const { data: isTeacher, error: userCheckError } = await supabaseUser.rpc('is_teacher');
    if (userCheckError) {
      console.log(`[gen-hint] user check error ${userCheckError?.message ?? userCheckError}`);
      throw new Error(`userPrerequisiteError: ${userCheckError?.message ?? userCheckError}`);
    }
    if (!isTeacher) {
      throw new Error(`Unauthorized access`);
    }
    const { data: hint, error: hintMsgError } = await supabaseAdmin.rpc('get_chatbot_hint_data', {
      p_question_id: question_id
    });
    if (hintMsgError) {
      console.log(`[gen-hint] n8n error ${hintMsgError?.message ?? hintMsgError}`);
      throw new Error(`hintPrerequisiteError: ${hintMsgError?.message ?? hintMsgError}`);
    }
    console.log(`[gen-hint] sending question id ${question_id} to n8n`);
    // Call n8n webhook
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: hint
      })
    });
    const hintResponse = await n8nResponse.json();
    const generatedHint = hintResponse?.[0]?.hints ?? [];
    console.log(`[gen-hint] recieved hints from n8n, sending hints back`);
    return new Response(JSON.stringify({
      data: generatedHint,
      success: true
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.log(`[gen-hint] generating hints failed`);
    return new Response(JSON.stringify({
      message: error?.message ?? error
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
