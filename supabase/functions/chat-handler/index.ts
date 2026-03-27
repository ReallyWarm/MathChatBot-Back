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
    let { mode, message, session_id, question_id } = await req.json();
    // Check error
    let n8nWebhookUrl;
    if (mode === 'question') {
      // N8N_QUESTION_TEST_WEBHOOK_URL
      n8nWebhookUrl = Deno.env.get('N8N_QUESTION_WEBHOOK_URL');
      if (!question_id) {
        throw new Error('Question id is required');
      }
    } else if (mode === 'theory') {
      // N8N_THEORY_TEST_WEBHOOK_URL
      n8nWebhookUrl = Deno.env.get('N8N_THEORY_WEBHOOK_URL');
      question_id = null;
    } else {
      throw new Error('Please provide mode as \'question\' or \'theory\'');
    }
    if (!n8nWebhookUrl) {
      throw new Error(`No webhook URL configured for mode: ${mode}`);
    }
    if (!message) {
      throw new Error('Message is required');
    }
    // Get session
    let currentSessionId = session_id;
    if (!currentSessionId) {
      const { data: newSession, error: sessionError } = await supabaseUser.rpc('create_chat_session', {
        p_question_id: mode === 'question' ? question_id : null
      });
      if (sessionError) {
        throw new Error(`sessionError: ${sessionError?.message ?? sessionError}`);
      }
      currentSessionId = newSession.session_id;
      if (!currentSessionId) {
        throw new Error('sessionError: Can not generate session_id');
      }
    }
    // // Store user message (n8n auto)
    // const { error: userMsgError } = 
    //   await supabaseUser.rpc('create_chat_message', { 
    //     p_session_id: currentSessionId,
    //     p_content: message
    //   });
    // if (userMsgError) {
    //   throw new Error(`msgStoreError: ${userMsgError?.message ?? userMsgError}`)
    // }
    // Call n8n webhook
    const n8nPayload = {
      message: message,
      sessionId: currentSessionId,
      mode: mode
    };
    const { data: hint, error: hintMsgError } = await supabaseAdmin.rpc('get_chatbot_hint_data', {
      p_question_id: question_id
    });
    if (hintMsgError) {
      throw new Error(`chatbotPrerequisiteError: ${hintMsgError?.message ?? hintMsgError}`);
    }
    // console.log(hint)
    Object.assign(n8nPayload, {
      hint: hint
    });
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(n8nPayload)
    });
    const botResponse = await n8nResponse.json();
    const botMessage = botResponse.message || botResponse.output || botResponse.text;
    // // Store bot response (n8n auto)
    // const { error: botMsgError } = 
    //   await supabaseUser.rpc('create_chat_message', { 
    //     p_session_id: currentSessionId,
    //     p_content: botMessage
    //   })
    // if (botMsgError) { 
    //   throw new Error(`msgStoreError: ${botMsgError?.message ?? botMsgError}`)
    // }
    return new Response(JSON.stringify({
      session_id: currentSessionId,
      message: botMessage,
      success: true
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
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
