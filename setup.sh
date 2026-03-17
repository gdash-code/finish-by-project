#!/bin/bash

# Finish By - Automated Setup Script
# This script will set up everything you need to run the app

echo "========================================="
echo "  Finish By - Project Setup"
echo "========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "❌ Node.js is not installed!"
    echo ""
    echo "Please install Node.js first:"
    echo "  👉 Visit: https://nodejs.org/"
    echo "  👉 Download the LTS version"
    echo "  👉 Run this script again after installation"
    echo ""
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "⚠️  Warning: Node.js version is too old (you have v$NODE_VERSION)"
    echo "Please upgrade to Node.js v18 or higher"
    echo "Download from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js detected: $(node -v)"
echo "✅ npm detected: $(npm -v)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
echo "   (This may take 1-2 minutes on first run)"
echo ""

npm install

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Installation failed!"
    echo "Please check the error messages above."
    exit 1
fi

echo ""
echo "========================================="
echo "  ✅ Setup Complete!"
echo "========================================="
echo ""
echo "You're ready to go! Here's what to do next:"
echo ""
echo "1️⃣  Start the development server:"
echo "   npm run dev"
echo ""
echo "2️⃣  Open your browser to:"
echo "   http://localhost:3000"
echo ""
echo "3️⃣  Start coding!"
echo "   - Edit src/App.jsx to modify the app"
echo "   - Changes will appear instantly"
echo ""
echo "📱 To test on your phone:"
echo "   - Look for the 'Network' URL when you run 'npm run dev'"
echo "   - Open that URL on your phone (same WiFi)"
echo ""
echo "📚 Need help? Check README.md"
echo ""
echo "Happy coding! 🚀"
echo ""
