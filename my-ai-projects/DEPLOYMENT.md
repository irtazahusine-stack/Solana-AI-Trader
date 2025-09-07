# Solana AI Trader - Deployment Guide

## Overview
This guide covers deployment options for both the FastAPI backend and the frontend application.

## Deployment Options

### Option 1: Vercel (Frontend) + Railway/Render (Backend) - RECOMMENDED
**Best for:** Quick deployment with minimal configuration
**Cost:** Free tier available

### Option 2: AWS (EC2 + S3/CloudFront)
**Best for:** Full control and scalability
**Cost:** Pay-as-you-go

### Option 3: DigitalOcean App Platform
**Best for:** Simple all-in-one deployment
**Cost:** $5-10/month

### Option 4: Self-hosted VPS
**Best for:** Complete control
**Cost:** $5-20/month

---

## Quick Deployment Guide (Vercel + Railway)

### Prerequisites
- GitHub account
- Vercel account (free)
- Railway account (free tier available)

### Step 1: Prepare the Project

#### 1.1 Create Environment Variables File
Create `.env` file in the backend directory:
```bash
# Solana RPC
SOLANA_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/YOUR_KEY
# Or use free endpoint
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# API Keys (optional but recommended)
COINGECKO_API_KEY=your_coingecko_key
OPENAI_API_KEY=your_openai_key  # For enhanced AI predictions

# Server Configuration
PORT=8000
HOST=0.0.0.0
CORS_ORIGINS=["https://your-frontend-domain.vercel.app"]
```

#### 1.2 Update Backend for Production
Create `backend/requirements.txt`:
```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
solana==0.30.2
numpy==1.24.3
pandas==2.0.3
scikit-learn==1.3.0
python-dotenv==1.0.0
httpx==0.25.0
websockets==12.0
pydantic==2.4.2
```

#### 1.3 Create Procfile for Backend
Create `backend/Procfile`:
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Step 2: Deploy Backend to Railway

1. **Push to GitHub**
```bash
cd /home/fareen/AI-Projects/my-ai-projects/solana-ai-trader
git init
git add .
git commit -m "Initial commit for deployment"
git remote add origin https://github.com/YOUR_USERNAME/solana-ai-trader.git
git push -u origin main
```

2. **Deploy on Railway**
- Go to [railway.app](https://railway.app)
- Click "New Project" → "Deploy from GitHub repo"
- Select your repository
- Railway will auto-detect Python/FastAPI
- Add environment variables in Railway dashboard
- Your backend will be deployed at: `https://your-app.railway.app`

### Step 3: Deploy Frontend to Vercel

1. **Update Frontend API URL**
Edit `frontend/app.js`:
```javascript
const API_BASE_URL = 'https://your-backend.railway.app';  // Your Railway URL
const WS_URL = 'wss://your-backend.railway.app/ws';
```

2. **Deploy to Vercel**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel

# Follow prompts:
# - Link to existing project? No
# - What's your project name? solana-ai-trader
# - In which directory is your code? ./
# - Want to override settings? No
```

Your frontend will be deployed at: `https://solana-ai-trader.vercel.app`

---

## Production Setup Scripts

### Backend Production Server (`backend/run_production.py`)
```python
import uvicorn
from main import app
import os
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=False,  # Disable reload in production
        workers=4,      # Multiple workers for better performance
        log_level="info"
    )
```

### Docker Deployment (Alternative)

#### Backend Dockerfile
```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Frontend Dockerfile
```dockerfile
FROM nginx:alpine

COPY . /usr/share/nginx/html

# Update API URL in JavaScript files
RUN sed -i 's|http://localhost:8000|https://api.yourdomain.com|g' /usr/share/nginx/html/*.js

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### Docker Compose (Full Stack)
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - SOLANA_RPC_URL=${SOLANA_RPC_URL}
      - CORS_ORIGINS=["http://localhost:3000"]
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend
    restart: unless-stopped
```

---

## Environment-Specific Configurations

### Development vs Production
Create `backend/config.py`:
```python
import os
from typing import List

class Settings:
    # Base Configuration
    APP_NAME = "Solana AI Trader"
    VERSION = "1.0.0"
    
    # Environment
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
    
    # API Configuration
    if ENVIRONMENT == "production":
        CORS_ORIGINS = os.getenv("CORS_ORIGINS", "").split(",")
        DEBUG = False
    else:
        CORS_ORIGINS = ["*"]
        DEBUG = True
    
    # Solana Configuration
    SOLANA_RPC_URL = os.getenv(
        "SOLANA_RPC_URL", 
        "https://api.mainnet-beta.solana.com"
    )
    
    # Security
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
    
settings = Settings()
```

---

## Deployment Checklist

### Before Deployment
- [ ] Remove all console.log statements in production
- [ ] Set up proper error logging
- [ ] Configure CORS properly
- [ ] Use environment variables for sensitive data
- [ ] Test all API endpoints
- [ ] Optimize frontend assets (minify JS/CSS)
- [ ] Set up SSL certificates
- [ ] Configure rate limiting
- [ ] Set up monitoring (e.g., Sentry)

### Security Considerations
1. **API Keys**: Never commit API keys to Git
2. **CORS**: Restrict to your frontend domain only
3. **Rate Limiting**: Implement to prevent abuse
4. **HTTPS**: Always use SSL in production
5. **Input Validation**: Sanitize all user inputs

### Performance Optimizations
1. **Frontend**:
   - Enable gzip compression
   - Use CDN for static assets
   - Implement caching headers
   - Lazy load components

2. **Backend**:
   - Use Redis for caching
   - Implement connection pooling
   - Use async operations
   - Add request timeouts

---

## Monitoring & Maintenance

### Recommended Services
- **Monitoring**: Datadog, New Relic, or Grafana
- **Error Tracking**: Sentry or Rollbar
- **Uptime Monitoring**: UptimeRobot or Pingdom
- **Logging**: LogDNA or Papertrail

### Health Check Endpoint
Add to `backend/main.py`:
```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }
```

---

## Cost Estimates

### Free Tier Options
- **Vercel**: Frontend hosting (free)
- **Railway**: Backend hosting ($5 free credit/month)
- **Netlify**: Alternative frontend hosting (free)
- **Render**: Alternative backend hosting (free tier)

### Paid Options (Monthly)
- **DigitalOcean**: $5-10
- **AWS**: $10-50 (depending on usage)
- **Google Cloud**: $10-50
- **Azure**: $10-50

---

## Quick Commands

### Local Testing
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python run_production.py

# Frontend
cd frontend
python -m http.server 3000
```

### Deployment Commands
```bash
# Deploy to Vercel (Frontend)
vercel --prod

# Deploy to Railway (Backend)
railway up

# Deploy with Docker
docker-compose up -d

# Deploy to Heroku
heroku create solana-ai-trader
git push heroku main
```

---

## Support & Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure backend allows frontend domain
   - Check API_BASE_URL in frontend

2. **WebSocket Connection Failed**
   - Some hosting providers don't support WebSockets
   - Use polling as fallback

3. **Rate Limiting**
   - Implement caching
   - Use batch requests
   - Consider upgrading RPC endpoint

4. **High Latency**
   - Use CDN for frontend
   - Deploy backend closer to users
   - Implement caching strategies

### Getting Help
- Check logs in your hosting dashboard
- Use browser DevTools for frontend issues
- Monitor API response times
- Set up alerts for errors

---

## Next Steps

1. Choose your deployment platform
2. Set up GitHub repository
3. Configure environment variables
4. Deploy backend first
5. Update frontend API URLs
6. Deploy frontend
7. Test everything
8. Set up monitoring
9. Configure custom domain (optional)

Good luck with your deployment! 🚀