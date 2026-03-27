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
    const { course_id, course_name, difficulty, course_description, picture_name, is_published } = await req.json();
    const { data, error } = await supabase.rpc('edit_course', {
      p_course_id: course_id,
      p_course_name: course_name,
      p_difficulty: difficulty,
      p_course_description: course_description,
      p_picture_name: picture_name,
      p_is_published: is_published
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
