#!/bin/bash
# Start script for DealerConnect backend

echo "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "Failed to install dependencies"
    exit 1
fi

echo ""
echo "Starting backend server..."
npm start
