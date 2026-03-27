// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
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
  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'), {
    global: {
      headers: {
        Authorization: authHeader
      }
    }
  });
  try {
    const { question_id, title, question, answer, difficulty, is_published, new_tags, delete_old_hint } = await req.json();
    const { data, error } = await supabase.rpc('edit_question', {
      p_question_id: question_id,
      p_title: title,
      p_question: question,
      p_answer: answer,
      p_difficulty: difficulty,
      p_is_published: is_published,
      p_new_tags: new_tags,
      p_delete_old_hint: delete_old_hint
    });
    if (error) {
      throw error;
    }
    return new Response(JSON.stringify({
      data
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
