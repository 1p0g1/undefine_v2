# Un-Define v2 Production Deployment Checklist

## ✅ Completed Tasks

### Database Migrations
- [x] Applied all database migrations successfully
- [x] Fixed leaderboard_summary table structure
- [x] Updated score calculations and data
- [x] Added players table
- [x] Added game session columns
- [x] Added score fields
- [x] Fixed word relationships
- [x] Removed deprecated word column

### Type Generation
- [x] Generated Supabase client types
- [x] Updated TypeScript types in the codebase

### Backend Logic
- [x] Fixed submitGuess required fields
- [x] Removed fallback word logic
- [x] Updated game session creation
- [x] Fixed leaderboard ranking

## 🔄 Remaining Tasks

### Environment Setup
✅ Backend (undefine-v2-back.vercel.app):
```env
SUPABASE_URL=https://eaclljwvsicezmkjnlbm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[Already set in Vercel]
SUPABASE_ANON_KEY=[Already set in Vercel]
JWT_SECRET=[Already set in Vercel]
DB_PROVIDER=supabase
NODE_ENV=production
```

✅ Frontend (undefine-v2-front.vercel.app):
```env
VITE_API_BASE_URL=https://undefine-v2-back.vercel.app
VITE_SUPABASE_URL=https://eaclljwvsicezmkjnlbm.supabase.co
VITE_SUPABASE_ANON_KEY=[Already set in Vercel]
```

### Build and Deploy
- [ ] Run production build for both projects:
  ```bash
  # Backend
  cd /
  npm run build

  # Frontend
  cd client/
  npm run build
  ```
- [ ] Deploy both projects to Vercel:
  - Backend: `vercel --prod` in root directory
  - Frontend: `vercel --prod` in client directory
- [ ] Verify all API endpoints using production URLs
- [ ] Test game functionality in production
- [ ] Monitor error logs in Vercel dashboard

### Post-Deployment
- [ ] Verify database migrations in production
- [ ] Test user authentication
- [ ] Validate scoring system
- [ ] Check leaderboard functionality
- [ ] Monitor performance metrics

## Rollback Plan
In case of deployment issues:
1. Revert to previous stable version using Vercel dashboard
2. Roll back database migrations if necessary using Supabase dashboard
3. Switch back to previous environment configuration
4. Contact team for immediate support

## Contact Information
- Technical Lead: [Add contact]
- Database Admin: [Add contact]
- DevOps Support: [Add contact]

## Production URLs
- Frontend: https://undefine-v2-front.vercel.app
- Backend: https://undefine-v2-back.vercel.app 