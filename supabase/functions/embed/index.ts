// Setup type definitions for built-in Supabase Runtime APIs
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
const n8nTimeoutMs = 30 * 1000;
const signedUrlExpiresMin = 5 * 60;
Deno.serve(async (req)=>{
  if (req.method !== 'POST') {
    return new Response('expected POST', {
      status: 405
    });
  }
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('No authorization header', {
      status: 401
    });
  }
  const service_key = authHeader?.replace('Bearer ', '');
  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL'), service_key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  // TEST: N8N_EMBED_TEST_WEBHOOK_URL
  // PROD: N8N_EMBED_WEBHOOK_URL
  const n8nEmbedUrl = Deno.env.get('N8N_EMBED_WEBHOOK_URL');
  if (!n8nEmbedUrl) {
    return new Response('n8n embedding url is not set', {
      status: 500
    });
  }
  // Get payload
  let payload;
  try {
    payload = await req.json();
  } catch (error) {
    return new Response('invalid JSON body', {
      status: 400
    });
  }
  const { job_id, doc_id, bucket_id, name, operation, attempt } = payload;
  console.log(`[embed] job_id=${job_id} doc_id=${doc_id} attempt=${attempt}`);
  // Get signed file URL
  const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage.from(bucket_id).createSignedUrl(name, signedUrlExpiresMin);
  if (signedUrlError || !signedUrlData?.signedUrl) {
    const errorMessage = signedUrlError?.message ?? 'failed to generate signed URL';
    console.error(`[embed] job ${job_id} could not generate signed URL:`, errorMessage);
    const { error: failJobError } = await supabaseAdmin.schema("vector").rpc('fail_embedding_job', {
      p_job_id: job_id,
      p_doc_id: doc_id,
      p_file_url: `${bucket_id}/${name}`,
      p_operation: operation,
      p_error: errorMessage,
      p_attempt: attempt
    });
    if (failJobError) {
      console.error(`[embed] failed to log failure:`, failJobError.message);
    }
    // Return 200 so pg_net doesn't treat this as a network failure.
    return new Response(JSON.stringify({
      success: false,
      job_id: job_id,
      error: errorMessage
    }), {
      headers: {
        'Content-Type': 'application/json'
      },
      status: 200
    });
  }
  const signedUrl = signedUrlData.signedUrl;
  console.log(`[embed] signed URL generated for job ${job_id}`);
  // n8n status
  let n8nSuccess = false;
  let errorMessage = '';
  // Call n8n 
  try {
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), n8nTimeoutMs);
    const n8nResponse = await fetch(n8nEmbedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        job_id,
        doc_id,
        file_url: signedUrl,
        operation
      }),
      signal: controller.signal
    });
    clearTimeout(timer);
    if (n8nResponse.ok) {
      n8nSuccess = true;
    } else {
      const body = await n8nResponse.text().catch(()=>'(unreadable body)');
      errorMessage = `n8n returned ${n8nResponse.status}: ${body}`;
    }
  } catch (error) {
    errorMessage = error?.message ?? error;
  }
  // Handle success
  if (n8nSuccess) {
    const { error: completeJobError } = await supabaseAdmin.schema("vector").rpc('complete_embedding_job', {
      job_id
    });
    if (completeJobError) {
      console.error(`[embed] failed to delete job ${job_id} from queue:`, completeJobError.message);
    } else {
      console.log(`[embed] job ${job_id} completed and removed from queue`);
    }
    return new Response(JSON.stringify({
      success: true,
      job_id: job_id
    }), {
      headers: {
        'Content-Type': 'application/json'
      },
      status: 200
    });
  }
  // Handle failure
  console.error(`[embed] job ${job_id} failed (attempt ${attempt}):`, errorMessage);
  const { error: failJobError } = await supabaseAdmin.schema("vector").rpc('fail_embedding_job', {
    p_job_id: job_id,
    p_doc_id: doc_id,
    p_file_url: `${bucket_id}/${name}`,
    p_operation: operation,
    p_error: errorMessage,
    p_attempt: attempt
  });
  if (failJobError) {
    console.error(`[embed] failed to log failure:`, failJobError.message);
  }
  // Return 200 so pg_net doesn't treat this as a network failure.
  return new Response(JSON.stringify({
    success: false,
    job_id: job_id,
    error: errorMessage
  }), {
    headers: {
      'Content-Type': 'application/json'
    },
    status: 200
  });
});
