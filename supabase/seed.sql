SELECT cron.schedule(
  'retry-embedding-jobs',
  '*/4 * * * *',
  $$SELECT util.retry_embedding_jobs();$$
);

SELECT cron.schedule(
  'cleanup-chat-session',
  '0 */12 * * *',
  $$
  DELETE FROM chat_session
  WHERE created_at < NOW() - interval '1 day';
  $$
);

-- SELECT cron.unschedule('retry-embedding-jobs');
-- SELECT cron.unschedule('cleanup-chat-session');