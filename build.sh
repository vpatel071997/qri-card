#!/bin/bash

echo "Running electron-builder based on the operating system..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Detected macOS. Running electron-builder for macOS..."
    electron-builder --mac --x64 --arm64
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    echo "Detected Windows. Running electron-builder for Windows..."
    electron-builder --win --x64 
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "Detected Linux. Running electron-builder for Linux..."
    electron-builder --linux --x64 --arm64
else
    echo "Unsupported operating system: $OSTYPE"
    exit 1
fi
