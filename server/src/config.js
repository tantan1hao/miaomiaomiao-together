import path from 'node:path';

export const config = {
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT || 3002),
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me',
  masterPassword: process.env.MASTER_PASSWORD || '000000',
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:3002',
  uploadDir: path.resolve(process.env.UPLOAD_DIR || '/var/lib/dish-rank/uploads'),
  uploadPublicPath: process.env.UPLOAD_PUBLIC_PATH || '/dish-uploads',
  maxImageBytes: 5 * 1024 * 1024,
  wechatAppId: process.env.WECHAT_APPID || '',
  wechatSecret: process.env.WECHAT_SECRET || ''
};
