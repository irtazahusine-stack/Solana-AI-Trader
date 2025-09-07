#!/bin/bash

# Solana AI Trader - Deployment Script

echo "🚀 Solana AI Trader Deployment Script"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command_exists git; then
    echo -e "${RED}Git is not installed. Please install Git first.${NC}"
    exit 1
fi

if ! command_exists python3; then
    echo -e "${RED}Python 3 is not installed. Please install Python 3 first.${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${YELLOW}npm is not installed. Installing Node.js is recommended for Vercel CLI.${NC}"
fi

echo -e "${GREEN}✓ Prerequisites check passed${NC}"

# Select deployment option
echo ""
echo "Select deployment option:"
echo "1) Quick Deploy (Vercel + Railway) - Recommended"
echo "2) Docker Deployment (Local/VPS)"
echo "3) Manual Setup (Custom VPS)"
echo "4) Development Setup Only"
read -p "Enter option (1-4): " option

case $option in
    1)
        echo -e "${YELLOW}Starting Quick Deploy...${NC}"
        
        # Install Vercel CLI if not installed
        if ! command_exists vercel; then
            echo "Installing Vercel CLI..."
            npm i -g vercel
        fi
        
        # Setup environment variables
        if [ ! -f .env ]; then
            echo "Creating .env file from template..."
            cp .env.example .env
            echo -e "${YELLOW}Please edit .env file with your configuration${NC}"
            read -p "Press enter when ready..."
        fi
        
        # Deploy Frontend
        echo -e "${YELLOW}Deploying Frontend to Vercel...${NC}"
        cd frontend
        
        # Update API URL
        read -p "Enter your backend URL (e.g., https://your-app.railway.app): " backend_url
        sed -i.bak "s|http://localhost:8000|$backend_url|g" app.js
        sed -i.bak "s|ws://localhost:8000|wss://${backend_url#https://}|g" app.js
        
        vercel --prod
        
        cd ..
        
        echo -e "${GREEN}✓ Frontend deployed!${NC}"
        echo -e "${YELLOW}Now deploy backend to Railway:${NC}"
        echo "1. Go to https://railway.app"
        echo "2. Connect your GitHub repo"
        echo "3. Add environment variables from .env"
        echo "4. Deploy!"
        ;;
        
    2)
        echo -e "${YELLOW}Starting Docker Deployment...${NC}"
        
        # Check if Docker is installed
        if ! command_exists docker; then
            echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
            exit 1
        fi
        
        # Create Docker Compose file
        cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
EOF
        
        # Build and run
        docker-compose up -d --build
        
        echo -e "${GREEN}✓ Docker deployment complete!${NC}"
        echo "Frontend: http://localhost"
        echo "Backend: http://localhost:8000"
        ;;
        
    3)
        echo -e "${YELLOW}Manual VPS Setup Instructions:${NC}"
        
        cat << 'EOF'
        
1. SSH into your VPS:
   ssh user@your-vps-ip

2. Install dependencies:
   sudo apt update
   sudo apt install python3 python3-pip nginx certbot python3-certbot-nginx git

3. Clone repository:
   git clone https://github.com/your-username/solana-ai-trader.git
   cd solana-ai-trader

4. Setup Backend:
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   
   # Create systemd service
   sudo nano /etc/systemd/system/solana-ai-trader.service
   
   [Unit]
   Description=Solana AI Trader API
   After=network.target
   
   [Service]
   Type=simple
   User=your-user
   WorkingDirectory=/path/to/solana-ai-trader/backend
   Environment="PATH=/path/to/solana-ai-trader/backend/venv/bin"
   ExecStart=/path/to/solana-ai-trader/backend/venv/bin/python run_production.py
   Restart=on-failure
   
   [Install]
   WantedBy=multi-user.target
   
   # Start service
   sudo systemctl enable solana-ai-trader
   sudo systemctl start solana-ai-trader

5. Setup Frontend with Nginx:
   sudo nano /etc/nginx/sites-available/solana-ai-trader
   
   server {
       listen 80;
       server_name your-domain.com;
       
       root /path/to/solana-ai-trader/frontend;
       index index.html;
       
       location / {
           try_files $uri $uri/ =404;
       }
       
       location /api {
           proxy_pass http://localhost:8000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   
   # Enable site
   sudo ln -s /etc/nginx/sites-available/solana-ai-trader /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx

6. Setup SSL:
   sudo certbot --nginx -d your-domain.com

EOF
        ;;
        
    4)
        echo -e "${YELLOW}Setting up development environment...${NC}"
        
        # Backend setup
        echo "Setting up backend..."
        cd backend
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
        
        # Create development .env
        if [ ! -f ../.env ]; then
            cp ../.env.example ../.env
            echo -e "${YELLOW}Created .env file. Please configure it.${NC}"
        fi
        
        cd ..
        
        echo -e "${GREEN}✓ Development setup complete!${NC}"
        echo ""
        echo "To run locally:"
        echo "Backend: cd backend && source venv/bin/activate && python main.py"
        echo "Frontend: cd frontend && python3 -m http.server 8080"
        ;;
        
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}🎉 Deployment process complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Configure environment variables in .env"
echo "2. Test all endpoints"
echo "3. Set up monitoring"
echo "4. Configure custom domain (optional)"
echo ""
echo "For detailed instructions, see DEPLOYMENT.md"