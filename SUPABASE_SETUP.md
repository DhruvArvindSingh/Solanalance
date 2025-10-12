# 🚀 SolanaLance Database Setup Guide

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click **"New Project"**
4. Fill in your project details:
   - **Name**: `solanalance` (or any name you prefer)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Select closest to your location
5. Click **"Create new project"**
6. Wait for the project to be created (2-3 minutes)

## Step 2: Get Project Credentials

1. In your Supabase dashboard, go to **Settings** > **API**
2. Copy these values:
   - **Project URL** (starts with `https://...supabase.co`)
   - **Project API Keys** > **anon public** key

## Step 3: Configure Environment Variables

Create a `.env` file in your project root (if it doesn't exist):

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

Replace the values with your actual Supabase credentials from Step 2.

## Step 4: Run Database Migration

### Option A: Using Supabase Dashboard (Recommended)

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Copy the entire contents of the migration file:
   ```bash
   supabase/migrations/20251011190000_create_solanalance_schema.sql
   ```
4. Paste it into the SQL Editor
5. Click **"Run"** (this may take 30-60 seconds)
6. You should see **"Success. No rows returned"** message

### Option B: Using Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

## Step 5: Verify Database Setup

1. In Supabase dashboard, go to **Database** > **Tables**
2. You should see these tables:
   - ✅ profiles
   - ✅ user_roles
   - ✅ jobs
   - ✅ job_stages
   - ✅ applications
   - ✅ projects
   - ✅ milestones
   - ✅ staking
   - ✅ transactions
   - ✅ user_wallets
   - ✅ ratings
   - ✅ trust_points
   - ✅ messages
   - ✅ notifications

3. Go to **Authentication** > **Settings** and make sure:
   - **Enable email confirmations** is OFF (for development)
   - **Enable phone confirmations** is OFF (for development)

## Step 6: Test the Application

1. Make sure your `.env` file is configured correctly
2. Restart your development server:
   ```bash
   npm run dev
   ```
3. Open your browser to `http://localhost:8081`
4. Try creating an account - you should be able to sign up successfully
5. After signing up, check the **Authentication** > **Users** section in Supabase dashboard

## 🔧 Troubleshooting

### Error: "Could not find the table 'public.jobs'"
- **Solution**: Make sure you ran the migration SQL in Step 4
- Check that all tables exist in your database

### Error: "Invalid API key"
- **Solution**: Double-check your `.env` file values
- Make sure you're using the **anon** key, not the service_role key
- Restart your dev server after changing `.env`

### Error: "Cross-origin request blocked"
- **Solution**: Check your Supabase project URL is correct
- Make sure you're using `https://` in the URL

### Error: "Row Level Security policy violation"
- **Solution**: The migration includes all necessary RLS policies
- If issues persist, check the policies in **Authentication** > **Policies**

## 🎉 Success!

Once setup is complete, your SolanaLance platform will have:
- ✅ User authentication with profiles
- ✅ Job posting and management
- ✅ Application system
- ✅ Project workspaces
- ✅ Blockchain transaction tracking
- ✅ Rating and trust system
- ✅ Real-time messaging

## 📞 Need Help?

If you encounter issues:
1. Check the browser console for error messages
2. Verify all environment variables are set correctly
3. Ensure the database migration completed successfully
4. Check Supabase logs in the dashboard under **Logs**

Happy building! 🚀
