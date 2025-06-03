# Un·DEFINE v2 Architecture Visualization Description

## **System Overview for AI Image Generation**

Create a modern, clean architectural diagram showing a **two-tier web application** with the following detailed components:

## **🎨 Visual Style Requirements**
- **Modern flat design** with subtle shadows and rounded corners
- **Color scheme**: Primary blue (#1a237e), accent colors (green #4caf50, orange #ff9800, red #ef5350)
- **Clean typography** with clear labels and hierarchy
- **Isometric or 3D perspective** to show depth and layers
- **Flow arrows** indicating data direction and relationships

## **🏗️ Architecture Components**

### **Frontend Layer (Left Side)**
**Visual**: Modern browser window with Vite.js logo
- **Framework**: React + TypeScript with Vite bundler
- **Deployment**: Vercel (show Vercel triangle logo)
- **URL**: `undefine-v2-front.vercel.app`
- **Components** (show as interconnected modules):
  - **Game Interface**: DEFINE letter boxes (D-E-F-I-N-E) in colorful squares
  - **Leaderboard Modal**: Ranking table with crown icon
  - **Settings Panel**: Gear icon with hamburger menu
  - **Toast Notifications**: Small popup messages
  - **Confetti System**: Colorful particles for celebrations

### **Backend Layer (Right Side)**
**Visual**: Server rack or cloud icon with Next.js logo
- **Framework**: Next.js API Routes
- **Deployment**: Separate Vercel instance (different color)
- **URL**: `undefine-v2-back.vercel.app`
- **API Endpoints** (show as service boxes):
  - **`/api/word`**: Word generation service (cached 1hr)
  - **`/api/guess`**: Real-time game processing (no cache)
  - **`/api/leaderboard`**: Ranking service (cached 5min)
  - **`/api/player/nickname`**: User management

### **Database Layer (Bottom Center)**
**Visual**: Supabase logo with PostgreSQL database icon
- **Service**: Supabase PostgreSQL
- **Tables** (show as connected database tables):
  - **`players`**: User profiles with display names
  - **`words`**: Daily word collection with clues
  - **`scores`**: Game completion records
  - **`user_stats`**: Player statistics and streaks
  - **`leaderboard_summary`**: Optimized ranking data with auto-triggers

### **Data Storage (Browser - Top Left)**
**Visual**: Browser storage icon with key-value pairs
- **localStorage**: Client-side persistence
  - Player ID and preferences
  - Game state and progress
  - Cached display names
  - Completion tracking

### **External Services (Top Right)**
**Visual**: Third-party service icons
- **Canvas Confetti**: Celebration animations
- **Environment Variables**: Secure configuration
- **CORS**: Cross-origin resource sharing

## **🔄 Data Flow Visualization**

### **Game Session Flow** (Show as numbered arrows)
1. **User starts game** → Frontend clears localStorage
2. **API call** → Backend `/api/word` (with 1-hour caching)
3. **Word data** → Frontend displays DEFINE boxes
4. **User guess** → Real-time API call to `/api/guess` (no cache)
5. **Game completion** → Multiple API calls (scores, leaderboard, stats)
6. **Leaderboard update** → Database triggers recalculate rankings
7. **Results display** → Cached leaderboard data (5-minute TTL)

### **Caching Strategy** (Show with different colored arrows)
- **Blue arrows**: Cached requests (word data, leaderboard)
- **Red arrows**: Real-time requests (guesses, game state)
- **Green arrows**: Database writes and triggers
- **Orange arrows**: LocalStorage operations

### **User Journey** (Show as user icon path)
1. **Game Start**: Load daily word with hints
2. **Gameplay**: Submit guesses with real-time feedback
3. **Hint Revelation**: Progressive clue unlocking (D→E→F→I→N→E)
4. **Completion**: Score calculation and confetti celebration
5. **Leaderboard**: View rankings and personal rank
6. **Social Sharing**: Copy shareable game result

## **🚀 Performance Features** (Show as optimization badges)
- **Smart Caching**: Different strategies per endpoint
- **Local Persistence**: Game state survival across sessions
- **Real-time Updates**: Instant feedback and leaderboard changes
- **Progressive Loading**: Staggered hint revelation
- **Error Recovery**: Toast notifications and graceful fallbacks

## **🎮 Game-Specific Elements**
- **DEFINE Boxes**: 6 letter squares (D-E-F-I-N-E) with color-coded states:
  - **Green**: Correct guess position
  - **Red**: Incorrect guess
  - **Orange**: Fuzzy match
  - **Blue**: Active position
  - **White**: Empty/unrevealed
- **Hint System**: Progressive revelation with hover tooltips
- **Scoring Algorithm**: Reward-based system (1000-500 points)
- **Special Animations**: Enhanced confetti for 1-guess wins

## **🔐 Security & Environment**
- **Separate Deployments**: Frontend and backend isolated
- **Environment Variables**: Secure API keys and database credentials
- **Player Privacy**: UUID-based identification
- **Data Validation**: Input sanitization and type checking

## **📱 Responsive Design**
- **Mobile-First**: Compact UI with space-saving features
- **Hamburger Menu**: Consolidated settings and navigation
- **Touch-Friendly**: Large tap targets and gesture support
- **Adaptive Text**: Clamp-based responsive typography

**Note for AI**: Please arrange these components in a logical flow showing the separation between frontend/backend deployments, the central database, and the various data flows between them. Use modern UI design principles with clear visual hierarchy and professional color schemes. 