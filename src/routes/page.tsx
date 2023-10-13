import { Elysia } from 'elysia';

import MainLayout from '~/views/layouts/main';
import Home from '~/views/pages/home';

export const pageRouter = new Elysia().get('/', async () => {
  return (
    <MainLayout>
      <Home />
    </MainLayout>
  );
});
