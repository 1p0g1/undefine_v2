# 🧠 Un-Define v2: Project Tracker

## 📁 Reference Docs

- docs/ARCHITECTURE.md (DO NOT MODIFY)
- docs/README.md (DO NOT MODIFY)

## 📋 Project Overview

Un-Define v2 is a complete rebuild of the word-guessing game with a focus on clean architecture, type safety, and maintainability. The project uses TypeScript throughout, with a React+Vite frontend and Express+Node backend, powered by Supabase.

## 🎯 Core Requirements

- Strict TypeScript implementation
- Modular architecture
- Performance-optimized
- Test-ready from day one
- Render-deployable
- Anonymous user tracking via UUID

## ✅ Phase 1: Project Setup & Infrastructure

### Environment & Configuration

- [x] Initialize monorepo structure
- [x] Configure root-level package.json with client/ and server/ as workspaces
- [x] Set up TypeScript configurations
- [x] Configure ESLint and Prettier
- [x] Create environment variable templates
- [x] Set up development scripts

### Database Setup

- [x] Initialize Supabase project
- [x] Create database tables:
  - [x] words
  - [x] game_sessions
  - [x] scores
  - [x] user_stats
  - [x] leaderboard_summary
- [x] Implement SQL relationships
- [x] Set up migration system
- [x] Snapshot schema in docs/SCHEMA.md before RLS is enabled
- [x] Add missing gameplay clue fields to words table
- [x] Update game_sessions table to track hint usage and clue status
- [x] Document leaderboard tie-breaker rules
- [x] Create README in supabase/migrations/ for migration strategy
- [x] Align TS schema types with new fields
- [x] Supabase words table fully seeded and verified (2024-06-10)
  - As of June 10, 2024, the Supabase `words` table is fully populated and confirmed via dashboard. No further seeding required; focus is now on leveraging this data in the app.

## 🚧 Phase 2: Backend Foundation

### Core Types & Interfaces

- [x] Define word-related types
- [x] Define game session types
- [x] Define user stats types
- [x] Define API response types

### API Implementation

- [x] Set up Express server
- [x] Implement /api/word endpoint
- [x] Implement /api/guess endpoint
- [x] Add input validation
- [x] Implement error handling
- [x] Add request logging

### Database Layer

- [x] Create Supabase client wrapper
- [ ] Implement word repository
- [x] Implement game session repository
  - [x] Create game session with UUID generation
  - [x] Get game session by ID
  - [x] Update game session
  - [x] Add guess with clue status tracking
  - [x] Implement proper error handling
- [ ] Implement user stats repository
- [x] Add database error handling

### Render Deployment Preparation

- [x] Fix TypeScript linter errors
- [x] Ensure type:module + ts-node/esm configurations are valid
- [x] Make sure there's no require() usage
- [x] Ensure .env is read safely with fallback for Render
- [x] Add prepare and build scripts to package.json
- [x] Confirm health check endpoint works
- [x] Add Render-ready comments

## 📝 Phase 3: Frontend Foundation

### Project Setup

- [ ] Initialize Vite + React
- [ ] Set up routing
- [ ] Configure state management
- [ ] Set up API client

### Core Components

- [ ] Create game board component
- [ ] Implement clue display system
- [ ] Create guess input component
- [ ] Build statistics display
- [ ] Implement localStorage persistence

### Styling

- [ ] Set up global styles
- [ ] Implement responsive design
- [ ] Add animations
- [ ] Create theme system

## 🔄 Phase 4: Game Logic

### Core Game Mechanics

- [ ] Implement word selection
- [ ] Create clue revelation system
- [ ] Build guess validation
- [ ] Add game state management
- [ ] Implement win/lose conditions
- [ ] Sync game state between backend and localStorage

### User Progress

- [ ] Add statistics tracking
- [ ] Implement streak system
- [ ] Create leaderboard logic
- [ ] Add progress persistence

## 🧪 Phase 5: Testing & Quality

### Testing Setup

- [x] Configure Jest
- [ ] Set up testing utilities
- [ ] Create mock data
- [x] Implement Supabase mock client (via DB_PROVIDER) for test mode

### Test Implementation

- [ ] Add API endpoint tests
- [ ] Create game logic tests
- [ ] Implement component tests
- [ ] Add integration tests

## 🚀 Phase 6: Deployment & Optimization

### Performance

- [ ] Optimize database queries
- [ ] Implement caching
- [ ] Add performance monitoring
- [ ] Optimize bundle size

### Deployment

- [ ] Set up Render configuration
- [ ] Create deployment scripts
- [ ] Add health checks
- [ ] Configure CI/CD

## 📚 Phase 7: Documentation

### Technical Docs

- [x] API documentation
- [ ] Component documentation
- [x] Database schema docs
- [ ] Deployment guide

### User Docs

- [ ] Game rules
- [ ] User guide
- [ ] FAQ
- [ ] Troubleshooting guide

## 🔒 Future Considerations

- RLS implementation
- JWT authentication
- Real-time multiplayer
- Word pools and categories
- Custom difficulty curves

## ⚠️ Critical Constraints

1. No modifications to:
   - docs/ARCHITECTURE.md
   - src/types.ts
   - .env.\* files
2. Strict adherence to:
   - TypeScript import rules
   - Supabase constraints
   - Frontend layout specifications
3. All changes must be:
   - Fully typed
   - Modular
   - Performance-conscious
   - Test-ready

## 📊 Progress Tracking

- Daily updates to this tracker
- Regular architecture reviews
- Performance benchmarking
- Test coverage monitoring
