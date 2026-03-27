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
    const { topic_id } = await req.json();
    const { data: deleteData, error: pgError } = await supabase.rpc('delete_topic', {
      p_topic_id: topic_id
    });
    if (pgError) {
      throw pgError;
    }
    const { topic_id: deleted_topic_id, question_file_path } = deleteData;
    if (question_file_path?.length) {
      const { error: imgDeleteError } = supabase.storage.from("question_image").remove(question_file_path);
      if (imgDeleteError) {
        throw imgDeleteError;
      }
    }
    return new Response(JSON.stringify({
      data: deleted_topic_id
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
