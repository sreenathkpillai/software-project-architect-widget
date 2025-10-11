# IMPORTANT DEVELOPMENT NOTES - READ FIRST!!!

## DATABASE COMMANDS - CRITICAL

### ⚠️ NEVER USE THESE COMMANDS:
- ❌ `npx prisma migrate dev` - Will fail in non-interactive environment
- ❌ `npx prisma migrate reset` - THIS IS PRODUCTION DATA, NEVER RESET
- ❌ Any commands with `--force` or `--accept-data-loss` flags

### ✅ ALWAYS USE THESE INSTEAD:
```bash
# To apply schema changes to database:
npx prisma db push --skip-generate

# Then generate the client:
npx prisma generate
```

### Why?
- This is a PRODUCTION database (Neon)
- The environment is non-interactive (can't use migrate dev)
- We need to preserve existing data at all times
- Use `db push` for schema changes, it's safer and works in this environment

## Project Context

### Current Implementation Status
- **Async Document Generation**: Implemented with two-stage tool calling
- **Response Times**: Currently 15-30 seconds (not yet at 3-second target)
- **Session State**: Added `currentStep` field to track progress

### Key Files
- `/app/api/chat/route.ts` - Main chat API with document generation
- `/prisma/schema.prisma` - Database schema
- `/components/workflow/ProjectDashboard.tsx` - UI stepper component

### Known Issues
- Response times still 15-30 seconds (investigating)
- UI stepper needs to read currentStep field

### Environment
- Database: Neon PostgreSQL
- Production data - BE CAREFUL
- Always use safe, nullable, default-value migrations

## ALWAYS REMEMBER
1. This is PRODUCTION data - never reset or force changes
2. Use `npx prisma db push` not migrate dev
3. Add default values for new fields
4. Test locally before pushing changes