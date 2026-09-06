import type { FastifyInstance } from 'fastify';

export type HealthRouteOptions = {
  version: string;
};

export default async function healthRoutes(
  app: FastifyInstance,
  options: HealthRouteOptions,
): Promise<void> {
  app.get('/api/health', async () => ({ status: 'ok', version: options.version }));
}
