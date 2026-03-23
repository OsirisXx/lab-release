VERCEL DEPLOYMENT GUIDE FOR LABTRACK

PREREQUISITES

1. GitHub account with the lab-release repository
2. Vercel account (free tier is sufficient)
3. Supabase project URL and anon key ready

STEP 1: PREPARE YOUR GITHUB REPOSITORY

The code is already pushed to:
https://github.com/OsirisXx/lab-release.git

Make sure all files are committed and pushed.

STEP 2: CONNECT VERCEL TO GITHUB

1. Go to https://vercel.com and sign in with your GitHub account

2. Click "Add New Project"

3. Import your repository:
   - Find "OsirisXx/lab-release" in the list
   - Click "Import"

STEP 3: CONFIGURE PROJECT SETTINGS

On the project configuration page:

1. Project Name: labtrack (or any name you prefer)

2. Framework Preset: Vite (should auto-detect)

3. Root Directory: Leave as "./" (default)

4. Build Command: npm run build (should auto-fill)

5. Output Directory: dist (should auto-fill)

6. Install Command: npm install (should auto-fill)

STEP 4: ADD ENVIRONMENT VARIABLES (CRITICAL)

This is the most important step. In the "Environment Variables" section:

1. Click "Add" to add a new environment variable

2. Add the first variable:
   Name: VITE_SUPABASE_URL
   Value: [paste your Supabase project URL]
   Example: https://yjuxwzdboxtukfbwixoj.supabase.co

3. Click "Add" again for the second variable:
   Name: VITE_SUPABASE_ANON_KEY
   Value: [paste your Supabase anon/public key]
   Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

4. Make sure both variables are set for:
   - Production
   - Preview
   - Development

STEP 5: DEPLOY

1. Click "Deploy" button

2. Wait 2-3 minutes for the build to complete

3. You will see a success message with your live URL

4. Your app will be available at:
   https://labtrack.vercel.app (or similar)

STEP 6: VERIFY DEPLOYMENT

1. Click "Visit" to open your deployed app

2. Test the following:
   - Login page loads correctly
   - Can register a new user
   - Can login with credentials
   - Dashboard loads
   - Inventory page works
   - All features are functional

STEP 7: CUSTOM DOMAIN (OPTIONAL)

If you want a custom domain:

1. Go to Project Settings in Vercel
2. Click "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

TROUBLESHOOTING

Problem: Build fails with "Module not found"
Solution: Make sure all dependencies are in package.json and committed to GitHub

Problem: App loads but shows connection errors
Solution: Check that environment variables are correctly set in Vercel dashboard

Problem: White screen after deployment
Solution: Check browser console for errors, verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are correct

Problem: 404 errors on page refresh
Solution: The vercel.json file handles this - make sure it's committed to GitHub

UPDATING YOUR DEPLOYMENT

Whenever you push new code to GitHub:

1. Vercel automatically detects the changes
2. Builds and deploys the new version
3. Your site updates in 2-3 minutes

You can also manually redeploy:
1. Go to Vercel dashboard
2. Select your project
3. Click "Redeploy" on any deployment

ENVIRONMENT VARIABLES REFERENCE

You need exactly 2 environment variables in Vercel:

Variable 1:
Name: VITE_SUPABASE_URL
Value: Your Supabase project URL from Supabase dashboard
Where to find: Supabase Dashboard > Project Settings > API > Project URL

Variable 2:
Name: VITE_SUPABASE_ANON_KEY
Value: Your Supabase anon public key from Supabase dashboard
Where to find: Supabase Dashboard > Project Settings > API > Project API keys > anon public

IMPORTANT NOTES

1. Never commit .env.local to GitHub (it's already in .gitignore)
2. Always set environment variables in Vercel dashboard
3. Environment variables are case-sensitive
4. After changing environment variables, you need to redeploy
5. The free Vercel tier is sufficient for this project

SHARING WITH YOUR CLIENT

After successful deployment, share:
1. The live URL (e.g., https://labtrack.vercel.app)
2. Login credentials for demo accounts
3. The CLIENT-SETUP-GUIDE.md for their reference

Your LabTrack system is now live and accessible from anywhere!
