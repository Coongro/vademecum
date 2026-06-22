import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: ['./src/schema/laboratory.ts'],
  out: './drizzle',
  dialect: 'postgresql',
  verbose: true,
  strict: true,
});
