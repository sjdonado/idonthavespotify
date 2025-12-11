import { ENV } from '~/config/env';
import { logger } from './logger';

type RequestHandler = (req: Request) => Response | Promise<Response>;

export interface AuthMiddlewareOptions {
  message?: string;
  statusCode?: number;
}

/**
 * API 认证中间件
 * 验证 Authorization header 中的 Bearer token
 */
export function withAuth(
  handler: RequestHandler,
  options: AuthMiddlewareOptions = {}
): RequestHandler {
  const {
    message = 'Unauthorized: Invalid or missing API key',
    statusCode = 401,
  } = options;

  return async (req: Request) => {
    // 如果没有配置 API_AUTH_KEY，则跳过验证
    if (!ENV.app.apiAuthKey) {
      return handler(req);
    }

    const authHeader = req.headers.get('Authorization');

    // 检查 Authorization header 是否存在
    if (!authHeader) {
      logger.warn('Missing Authorization header');
      return new Response(
        JSON.stringify({
          error: message,
        }),
        {
          status: statusCode,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer',
          },
        }
      );
    }

    // 验证 Bearer token 格式
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      logger.warn('Invalid Authorization header format');
      return new Response(
        JSON.stringify({
          error: 'Invalid Authorization header format. Expected: Bearer <token>',
        }),
        {
          status: statusCode,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer',
          },
        }
      );
    }

    const token = parts[1];

    // 验证 API key
    if (token !== ENV.app.apiAuthKey) {
      logger.warn('Invalid API key provided');
      return new Response(
        JSON.stringify({
          error: message,
        }),
        {
          status: statusCode,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer',
          },
        }
      );
    }

    // 验证通过，继续执行原始处理器
    return handler(req);
  };
}
