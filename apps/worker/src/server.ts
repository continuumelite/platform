import Fastify from 'fastify';

/**
 * Background service: wearable webhooks (Garmin, aggregators), data sync,
 * scheduled jobs, and (Phase 3) AI drafting.
 */
export function buildServer() {
  const server = Fastify({ logger: true });

  server.get('/health', async () => ({ status: 'ok' }));

  return server;
}
