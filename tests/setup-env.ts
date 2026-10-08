process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://app:app@localhost:5432/marketplace_test";
process.env.APP_SECRET ??= "test-secret-0123456789abcdef0123456789abcdef";
process.env.SITE_URL ??= "http://localhost:3000";
process.env.ALLOW_SYNTHETIC_DATA ??= "false";
process.env.ALLOW_INDEXING ??= "false";
