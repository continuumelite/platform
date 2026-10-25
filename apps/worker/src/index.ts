import { buildServer } from './server';

const port = Number(process.env.PORT ?? 8787);
const server = buildServer();

server.listen({ port, host: '0.0.0.0' }).catch((err) => {
  server.log.error(err);
  process.exit(1);
});
