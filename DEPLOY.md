# StarTronics - Vercel Deployment Guide

## Quick Deploy to Vercel

### Prerequisites
1. GitHub account with your code pushed
2. Vercel account (sign up at https://vercel.com)
3. Supabase project set up
4. Stripe account (optional, for payments)

### Steps to Deploy

#### 1. Push Your Code to GitHub
```bash
# Navigate to your project
cd E:\MAS\Sem_6\App\StarTronics

# Initialize git (if not done)
git init
git add .
git commit -m "Initial commit: StarTronics platform"

# Add remote and push
git remote add origin https://github.com/Arnold-Dsouza/StarTronics.git
git branch -M main
git push -u origin main
```

#### 2. Deploy on Vercel
1. Go to https://vercel.com and sign in with GitHub
2. Click "Add New..." → "Project"
3. Import your `StarTronics` repository
4. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

#### 3. Add Environment Variables
In Vercel project settings, add these environment variables:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_STRIPE_PUBLIC_KEY=pk_test_your_stripe_key (optional)
```

**How to get Supabase credentials:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API
4. Copy the Project URL and anon/public key

#### 4. Deploy
Click "Deploy" and wait for the build to complete!

### Post-Deployment

#### Update Supabase URL Configuration
1. Go to your Supabase project
2. Navigate to Authentication → URL Configuration
3. Add your Vercel URL to allowed redirect URLs:
   - `https://your-app.vercel.app/*`
   - `https://your-app.vercel.app/auth/callback`

#### Custom Domain (Optional)
1. In Vercel project settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

### Troubleshooting

**Build fails?**
- Check that all environment variables are set
- Ensure `frontend/package.json` has all dependencies
- Check build logs in Vercel dashboard

**Blank page after deployment?**
- Verify environment variables are set correctly
- Check browser console for errors
- Ensure Supabase URL is whitelisted in Supabase settings

**Authentication not working?**
- Add Vercel domain to Supabase allowed redirect URLs
- Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are correct

### Local Development
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `VITE_STRIPE_PUBLIC_KEY` | Stripe publishable key | No |

### Automatic Deployments
Every push to `main` branch will trigger automatic deployment on Vercel.

For preview deployments, push to any other branch or create a pull request.

---

**Need help?** Check Vercel docs at https://vercel.com/docs
