# 🎯 Un-Define v2: Project Rules

## ⚠️ MANDATORY DOCUMENTATION RULE

**EVERY SINGLE PROMPT RESPONSE MUST:**

1. **CHECK Documentation First**
   ```
   REQUIRED ORDER:
   1. docs/mvp.md
   2. docs/implementation-plan.mdc
   3. docs/ARCHITECTURE.md
   4. docs/ACTUAL_DATABASE_SCHEMA.md
   5. Relevant component docs
   ```

2. **UPDATE Documentation After Changes**
   ```
   REQUIRED UPDATES:
   1. Add "Recent Changes" entry with:
      - Date (YYYY-MM-DD)
      - Time (HH:MM)
      - Files modified
      - Change reason
      - System impact
   2. Update all affected documentation
   3. Verify documentation consistency
   ```

3. **VERIFY Recent Changes**
   ```
   REQUIRED CHECKS:
   1. Check last 3 recent changes entries
   2. Verify no conflicts with recent changes
   3. Ensure changes align with recent updates
   ```

❌ **BREAKING THIS RULE IS NOT ALLOWED**
- No exceptions
- No skipping documentation checks
- No undocumented changes
- No unverified recent changes

## 📚 Document Authority

### Protected Files (DO NOT MODIFY)

- `docs/ARCHITECTURE.md` - Backend, DB, and API source of truth
- `docs/README.md` - Frontend, setup, and gameplay rules
- `src/types.ts` - Core type definitions
- `.env*` files - Environment configurations

### Documentation Check Rule

EVERY response MUST check these documents in this order:
1. `docs/mvp.md` - Primary source of truth for project requirements
2. `docs/implementation-plan.mdc` - Current progress and implementation details
3. `docs/ARCHITECTURE.md` - Technical architecture and patterns
4. `docs/ACTUAL_DATABASE_SCHEMA.md` - Database schema and relationships
5. `docs/README.md` - Documentation hierarchy and guidelines

This check must be performed BEFORE any code changes or suggestions are made.

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

## Documentation & Change Tracking

### 📝 Documentation Rules
⚠️ See **MANDATORY DOCUMENTATION RULE** at top of file - THIS MUST BE FOLLOWED

Additional documentation guidelines:
1. Every code change MUST be documented
2. Every prompt response MUST:
   - Follow the mandatory documentation rule
   - Check documentation in the specified order
   - Update documentation if changes are made
   - Add a "Recent Changes" entry with required fields
3. Documentation locations to check/update:
   - `docs/mvp.md` - Primary source of truth
   - `docs/implementation-plan.mdc` - Implementation status
   - `docs/ARCHITECTURE.md` - Technical architecture
   - `docs/ACTUAL_DATABASE_SCHEMA.md` - Database schema
   - Component-specific docs in their directories

### 🔄 Change Tracking Process
1. Before making changes:
   - Review documentation in required order
   - Check last 3 recent changes entries
   - Verify current state matches docs
   - Ensure no conflicts with recent changes

2. While making changes:
   - Document decisions and rationale
   - Update types and interfaces
   - Note any technical debt created
   - Keep track of all modified files

3. After making changes:
   - Add detailed "Recent Changes" entry
   - Update all affected documentation
   - Verify documentation consistency
   - Cross-reference with recent changes

### ✅ Documentation Checklist
Before completing ANY task:
- [ ] Followed mandatory documentation rule
- [ ] Checked documentation in required order
- [ ] Verified last 3 recent changes
- [ ] Updated affected documentation
- [ ] Added complete recent changes entry
- [ ] Verified documentation consistency
- [ ] Updated types and interfaces
- [ ] Added implementation notes
