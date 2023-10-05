import { Elysia } from 'elysia';
import { apiRouter } from './routes/api';

const app = new Elysia().use(apiRouter).listen(Bun.env.PORT ?? 3000);

console.log(`Server is running at ${app.server?.hostname}:${app.server?.port}`);
