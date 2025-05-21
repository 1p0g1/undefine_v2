# MVP Development Plan

## Current Temporary Solutions

### Player ID Handling
- **Current Implementation**: Hardcoded player_id for initial API testing
- **Why**: To quickly verify API route functionality without implementing full player authentication/session management
- **Technical Debt**: This is a temporary solution to unblock API testing
- **Future Implementation**:
  1. Implement proper session management
  2. Generate unique player_ids on first visit
  3. Store in localStorage (Wordle-style persistence)
  4. Add proper validation middleware

### Environment Variable Handling
- **Current Issue**: NEXT_PUBLIC_API_BASE_URL not being injected properly during build time
- **Impact**: Frontend unable to connect to backend API in preview deployments
- **Technical Details**: Environment variable needs to be available during build process for proper client-side bundling
- **Required Fix**:
  1. Ensure environment variables are properly set in Vercel before build
  2. Verify variable injection in client-side bundle
  3. Consider implementing runtime configuration fallback
  4. Add build-time validation for required environment variables

## MVP Testing Priorities
1. Verify API routes are working
2. Test basic game mechanics
3. Ensure word fetching/guessing flow works
4. Validate basic scoring system

## Post-MVP Authentication Plan
1. Implement proper player tracking
2. Add session validation middleware
3. Secure all API routes with proper player context
4. Add rate limiting and abuse prevention
5. Implement proper error handling for missing/invalid player_ids 