import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const cjsExports = require('./index.cjs');
export const api = cjsExports.api;
