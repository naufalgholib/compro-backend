#!/bin/sh

echo "Running Prisma Generate..."
npx prisma generate --config prisma/prisma.config.js

echo "Starting application..."
npm start
