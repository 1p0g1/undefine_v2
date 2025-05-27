# Un-Define Documentation

Last Updated: May 2024

## Documentation Hierarchy

### Core Documentation
- `mvp.md` - Project goals, business requirements, and long-term reference ⭐️
- `implementation-plan.mdc` - Live execution log and progress tracking 📝
- `ARCHITECTURE.md` - Technical architecture and implementation patterns 🏗️
- `supa_alignment.md` - Supabase schema and database column mapping 🗄️
- `api_responses.md` - Canonical API response shapes 📡

### Archived/Legacy Documentation
- `vercel_alignment.md` - Historical deployment debugging (archived May 2024) 📦

## Recent Changes (May 2024)

1. **Schema Optimizations**
   - Foreign key alignment and cleanup
   - Session management improvements
   - Development tools and frontend state alignment

2. **Documentation Updates**
   - Added `api_responses.md` for canonical API shapes
   - Updated schema documentation with nullability indicators
   - Consolidated deployment documentation

## Documentation Guidelines

1. **Source of Truth**
   - `mvp.md` is the primary reference for project requirements
   - All implementation decisions must align with MVP specifications
   - Changes to core functionality must be documented in MVP

2. **Implementation Tracking**
   - `implementation-plan.mdc` tracks all changes and progress
   - New features/changes must be logged here
   - Include dates and reasoning for significant changes

3. **Architecture Updates**
   - `ARCHITECTURE.md` reflects current technical implementation
   - Update when introducing new patterns or components
   - Include code examples for key patterns

4. **Database Schema**
   - `supa_alignment.md` maintains database documentation
   - Update when modifying schema or adding tables
   - Document column usage and relationships

5. **API Documentation**
   - `api_responses.md` defines canonical response shapes
   - Update when modifying API contracts
   - Include TypeScript interfaces and examples

## Documentation Update Process

1. For new features:
   - Update `implementation-plan.mdc` first
   - Reflect changes in `ARCHITECTURE.md`
   - Update `mvp.md` if feature scope changes

2. For schema changes:
   - Update `supa_alignment.md`
   - Add migration notes to `implementation-plan.mdc`
   - Update affected API responses in `api_responses.md`

3. For pattern changes:
   - Update `ARCHITECTURE.md`
   - Add reasoning to `implementation-plan.mdc`
   - Update any affected API documentation 