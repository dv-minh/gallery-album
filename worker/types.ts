export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  ASSETS: Fetcher;
  ADMIN_CODE: string;
}

export type AppEnv = { Bindings: Env };
