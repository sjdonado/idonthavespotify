import umami from '@umami/node';

import { ENV } from '~/config/env';

umami.init({
  websiteId: 'da89a7a2-dd17-4c7f-b7ff-de28a7046a0e',
  hostUrl: ENV.services.umami.apiUrl,
});

export default umami;
