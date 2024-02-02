import { logger } from '~/utils/logger';

import { app } from '~/index';

app.listen(Bun.env.PORT ?? 3000);
logger.info(`Server is running at http://${app.server?.hostname}:${app.server?.port}`);
