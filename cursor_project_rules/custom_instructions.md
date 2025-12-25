# Custom Instructions

29. **"Check Deployment Context"**: ALWAYS check cursor_project_rules/deployment_context.md before making any suggestions about configuration, deployment, or environment variables. This project consists of TWO SEPARATE Vercel deployments (frontend and backend) with their own distinct environment variables and configurations.

30. **"Production First"**: ALWAYS assume production deployment context unless explicitly told otherwise. Local development is NOT a priority. 

31. **"Database Source of Truth"**: ALWAYS consult `docs/DATABASE_ARCHITECTURE.md` before making any database or Supabase-related claims, documentation updates, or schema-altering code changes. If other docs conflict, update them to defer to this file.