#!/usr/bin/env bash
# Automated deploy script for Proservice Express Backend on AWS EC2
set -e

echo "[DEPLOY] Pulling latest code from git repository..."
git pull origin main

echo "[DEPLOY] Installing Node dependencies..."
npm install --production=false

echo "[DEPLOY] Building TypeScript project..."
npm run build

echo "[DEPLOY] Restarting PM2 process..."
pm2 restart proservice-be || pm2 start dist/index.js --name proservice-be
pm2 save

echo "[DEPLOY] Proservice Backend successfully updated and running!"
