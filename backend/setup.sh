#!/bin/bash

echo "🚀 Setting up Hackathon Tracker Backend..."

# Check Python version
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "✓ Python $python_version detected"

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Verify .env file
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Please copy .env.example to .env and fill in your credentials."
    exit 1
fi

echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Ensure your Supabase database schema is set up (see README.md)"
echo "2. Run the server: python main.py"
echo "3. Open http://localhost:8000/docs for API documentation"
