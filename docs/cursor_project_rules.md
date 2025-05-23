# 🎯 Un-Define v2: Project Rules

## 📚 Document Authority

### Protected Files (DO NOT MODIFY)

- `docs/ARCHITECTURE.md` - Backend, DB, and API source of truth
- `docs/README.md` - Frontend, setup, and gameplay rules
- `src/types.ts` - Core type definitions
- `.env*` files - Environment configurations

### Live Tracking

- `docs/v2_Project_Tracker.md` - Task progress (update only when requested)

## ✅ Validation Checklist

### Before Making Changes

- [ ] Referenced ARCHITECTURE.md for backend/DB/API decisions
- [ ] Checked README.md for frontend/setup requirements
- [ ] Verified task exists in Project Tracker
- [ ] Confirmed no protected files will be modified

### During Development

- [ ] Using strict TypeScript (no `any`, no implicit undefined)
- [ ] Following modular design principles
- [ ] Maintaining Supabase + Render compatibility
- [ ] Implementing proper error handling
- [ ] Adding appropriate type definitions
- [ ] Following API endpoint specifications
- [ ] Matching database schema requirements

### Before Committing

- [ ] No .js extensions in TypeScript files
- [ ] No test/debug code in core components
- [ ] No implicit null/undefined behaviors
- [ ] All changes tracked in Project Tracker
- [ ] Mock/production mode handled correctly
- [ ] Using localStorage UUIDs for player_id

## 🔍 Code Review Checklist

### TypeScript

- [ ] No `any` types
- [ ] No implicit undefined
- [ ] Proper interface definitions
- [ ] Correct import/export syntax

### Architecture

- [ ] Follows modular design
- [ ] Matches API specifications
- [ ] Aligns with database schema
- [ ] Compatible with Supabase

### Testing

- [ ] Proper test coverage
- [ ] Mock data implemented
- [ ] Test mode handled
- [ ] No debug code in production

### Security

- [ ] Environment variables protected
- [ ] API endpoints secured
- [ ] Data validation implemented
- [ ] Error handling in place

## 🚫 Prohibited Actions

### Never Modify

- Protected documentation files
- Environment configuration
- Core type definitions
- Project tracker (without request)

### Never Include

- .js extensions in TypeScript
- Test code in core components
- Implicit null/undefined
- Untracked changes

## 📝 Workflow Requirements

### Task Management

1. Check Project Tracker for existing tasks
2. Create subtasks if needed
3. Update progress with [x] marks
4. Ask questions proactively

### Development Mode

1. Check DB_PROVIDER setting
2. Use appropriate client (mock/production)
3. Handle UUIDs correctly
4. Follow environment guidelines

## 🎯 Implementation Guidelines

### API Development

1. Follow ARCHITECTURE.md endpoints
2. Implement proper validation
3. Add error handling
4. Include type definitions

### Database Operations

1. Match schema specifications
2. Use correct relationships
3. Implement RLS when required
4. Handle migrations properly

### Frontend Development

1. Follow README.md guidelines
2. Implement responsive design
3. Use specified styling
4. Handle state management

## 🔄 Update Process

### For Project Tracker

1. Only update when requested
2. Mark tasks as [x] when complete
3. Add new tasks only when approved
4. Keep progress current

### For Documentation

1. Never modify protected files
2. Create new docs if needed
3. Update only when requested
4. Follow existing formats

29. **"Read MVP CREED First"**: ALWAYS read and follow the CREED section at the top of mvp.md before processing any prompt. This CREED contains critical architectural and environment configuration details that must be respected in all changes.
