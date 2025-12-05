#!/bin/sh

echo "Running Prisma Generate..."
node /node_modules/prisma/build/index.js generate --config prisma/prisma.config.js

echo "Starting application..."
node src/app.js
