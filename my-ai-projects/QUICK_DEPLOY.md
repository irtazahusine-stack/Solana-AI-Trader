# 🚀 QUICK DEPLOYMENT - Get Live in 10 Minutes!

## Step 1: Create Accounts (2 minutes)
1. **GitHub**: https://github.com/signup (if you don't have one)
2. **Vercel**: https://vercel.com/signup (sign in with GitHub)
3. **Railway**: https://railway.app (sign in with GitHub)

## Step 2: Push to GitHub (3 minutes)

Open terminal in project folder and run:

```bash
# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Deploy Solana AI Trader"

# Create repo on GitHub (manually):
# 1. Go to https://github.com/new
# 2. Name: solana-ai-trader
# 3. Public/Private: Your choice
# 4. Click "Create repository"
# 5. Copy the repository URL

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/solana-ai-trader.git

# Push to GitHub
git push -u origin main
```

## Step 3: Deploy Backend to Railway (2 minutes)

1. Go to https://railway.app/new
2. Click **"Deploy from GitHub repo"**
3. Select **solana-ai-trader** repository
4. Railway will automatically detect FastAPI
5. Click **"Add Variables"** and add:
   ```
   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
   PORT=8000
   ```
6. Click **"Deploy"**
7. Wait for deployment (1-2 minutes)
8. Click on the deployment
9. Go to **Settings** → **Domains**
10. Click **"Generate Domain"**
11. Copy your backend URL (like: `https://solana-ai-trader-production.up.railway.app`)

## Step 4: Deploy Frontend to Vercel (3 minutes)

First, update the backend URL in your frontend:

```bash
# Update the API URL (replace with your Railway URL from Step 3)
sed -i '' 's|http://localhost:8000|https://YOUR-APP.up.railway.app|g' frontend/app.js
sed -i '' 's|ws://localhost:8000|wss://YOUR-APP.up.railway.app|g' frontend/app.js

# Commit the change
git add frontend/app.js
git commit -m "Update API URL for production"
git push
```

Now deploy to Vercel:

1. Go to https://vercel.com/new
2. Click **"Import Project"**
3. Select **solana-ai-trader** repository
4. Configure:
   - Framework Preset: **Other**
   - Root Directory: **frontend**
   - Build Command: (leave empty)
   - Output Directory: **.**
5. Click **"Deploy"**
6. Wait for deployment (1-2 minutes)
7. Your app is live! 🎉

## Your Live URLs:

After deployment, you'll have:
- **Frontend**: `https://solana-ai-trader.vercel.app`
- **Backend API**: `https://solana-ai-trader-production.up.railway.app`
- **API Docs**: `https://solana-ai-trader-production.up.railway.app/docs`

## Test Your Live App:

1. Visit your frontend URL
2. Check that "API Connected" shows in the header
3. Navigate through all pages
4. Charts should load with live data

## Troubleshooting:

**If charts don't load:**
- Check browser console for errors
- Verify backend URL is correct in frontend/app.js
- Make sure Railway app is running

**If "Connection Error" shows:**
- Double-check the API URL in frontend/app.js
- Ensure both frontend and backend are deployed
- Check Railway logs for errors

## Next Steps:

1. **Custom Domain** (optional):
   - Vercel: Settings → Domains → Add
   - Railway: Settings → Domains → Add Custom Domain

2. **Monitor Your App**:
   - Railway: See logs and metrics in dashboard
   - Vercel: Analytics available in dashboard

3. **Updates**:
   ```bash
   # Make changes
   git add .
   git commit -m "Update description"
   git push
   # Both platforms auto-deploy on push!
   ```

---

## 🎊 Congratulations! Your Solana AI Trader is LIVE!

Share your app URL with others and start trading! 🚀