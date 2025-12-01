import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import path from 'path';

export default defineConfig({
  schema: path.join(__dirname, 'schema.prisma'),
  migrations: {
    path: path.join(__dirname, 'migrations'),
    seed: 'node prisma/seed.js',
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
