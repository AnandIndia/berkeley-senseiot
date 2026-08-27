#!/usr/bin/env bash
echo "===================================================="
echo "  BERKELEY SENSEIOT - IoT Asset Monitoring Portal"
echo "  Defined by Trust"
echo "===================================================="
echo "Starting server on http://localhost:3000 ..."
export PORT=${PORT:-3000}
node server.js
