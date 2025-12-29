# Tournament System Testing Documentation

## Overview
This document describes the complete testing strategy for the GST Tennis Academy Tournament System, covering all three tournament types, role-based access, and statistics features.

## Test Files

### 1. Automated Tests
**Location:** `src/__tests__/tournament-flows.test.ts`

Complete Jest test suite covering:
- Eliminazione Diretta flow (creation → enrollment → bracket → matches → completion)
- Girone + Eliminazione flow (creation → groups → group matches → advancement → knockout)
- Campionato flow (creation → round-robin calendar → matches → standings)
- Statistics and reports generation
- Role-based access control
- Tennis scoring validation
- Error handling scenarios

**Run tests:**
```bash
npm test
npm test tournament-flows.test.ts
```

### 2. Manual Testing Guide
**Location:** `docs/TESTING_GUIDE.md`

Comprehensive manual testing scenarios with checklists for:
- All 3 tournament types (step-by-step)
- All 4 user roles (admin, gestore, maestro, atleta)
- Statistics and reports validation
- Tennis scoring edge cases
- Error handling verification
- UI/UX testing across devices
- Bug report template

### 3. Quick Test Script
**Location:** `scripts/test-tournaments.js`

Fast automated health check script that tests:
- Server connectivity
- API endpoint availability
- Database connectivity
- Public pages accessibility
- Reports functionality

**Run quick tests:**
```bash
node scripts/test-tournaments.js
```

## Testing Strategy

### Phase 1: Unit Tests (Automated)
Run Jest test suite to verify core functionality:
```bash
npm test
```

Tests cover:
- ✅ Tournament CRUD operations
- ✅ Bracket generation algorithms
- ✅ Group stage logic
- ✅ Round-robin calendar generation
- ✅ Score validation
- ✅ Winner determination
- ✅ Statistics calculations

### Phase 2: Integration Tests (Quick Script)
Run quick connectivity tests:
```bash
node scripts/test-tournaments.js
```

Verifies:
- ✅ Server running
- ✅ API endpoints responding
- ✅ Database accessible
- ✅ Reports generating

### Phase 3: Manual E2E Tests (Manual Guide)
Follow `docs/TESTING_GUIDE.md` for comprehensive testing:

**Scenario 1: Eliminazione Diretta**
- Create tournament with 8 players
- Generate elimination bracket
- Play all rounds (quarterfinals → semifinals → final)
- Verify winner declared

**Scenario 2: Girone + Eliminazione**
- Create tournament with 8 players
- Generate 2 groups
- Play group stage (round-robin per group)
- Advance top 2 from each group
- Play knockout phase
- Verify seeding and winner

**Scenario 3: Campionato**
- Create championship with 6 players
- Generate round-robin calendar
- Play all 15 matches across giornate
- Verify standings and tiebreakers
- Confirm final ranking

**Scenario 4: Role-Based Access**
- Test admin: Full access
- Test gestore: Same as admin for tournaments
- Test maestro: Read-only access
- Test atleta: Enrollment and viewing

**Scenario 5: Statistics**
- Verify player rankings
- Check win rates calculation
- Validate tournament statistics
- Test public rankings page

### Phase 4: Regression Testing
After any code changes, re-run:
1. `npm test` - Automated tests
2. `node scripts/test-tournaments.js` - Quick health check
3. Manual spot checks of critical flows

## Test Data Requirements

### Test Users
Create test users for each role:
- **admin@test.com** - Admin role
- **gestore@test.com** - Gestore role
- **maestro@test.com** - Maestro role
- **atleta1@test.com** through **atleta8@test.com** - Atleta role

### Test Tournaments
Create sample tournaments for each type:
1. **Eliminazione Diretta** - 8 players
2. **Girone + Eliminazione** - 8 players, 2 groups
3. **Campionato** - 6 players, round-robin

## Critical Test Cases

### 1. Tournament Creation
- ✅ All required fields validated
- ✅ Tournament type selection works
- ✅ Best-of selection (3 or 5) works
- ✅ Max participants enforced
- ✅ Start date validation

### 2. Enrollment System
- ✅ Athletes can enroll in open tournaments
- ✅ Full capacity prevents enrollment
- ✅ Duplicate enrollment prevented
- ✅ Enrollment shows in athlete dashboard

### 3. Bracket Generation
- ✅ Correct number of matches created
- ✅ Participants properly seeded
- ✅ Bye handling for non-power-of-2
- ✅ Duplicate generation prevented

### 4. Group Stage
- ✅ Even distribution of participants
- ✅ Round-robin within groups
- ✅ Standings calculation (points, set diff, game diff)
- ✅ Top 2 advancement with seeding

### 5. Match Scoring
- ✅ Best-of-3 validation (max 3 sets)
- ✅ Best-of-5 validation (max 5 sets)
- ✅ Winner determination
- ✅ Set and game counting
- ✅ Tie-break support

### 6. Statistics & Reports
- ✅ Player rankings calculation
- ✅ Win rate accuracy
- ✅ Tournament statistics
- ✅ Top performers identification
- ✅ Public rankings page

### 7. Role Permissions
- ✅ Admin: Full access
- ✅ Gestore: Tournament management
- ✅ Maestro: Read-only viewing
- ✅ Atleta: Enrollment + viewing

## Known Issues & Limitations

### Current Limitations
1. **Authentication in Tests**: Automated tests may require auth mocking
2. **Multiple Users**: Manual tests need multiple real users
3. **Real-time Updates**: May need page refresh for some updates

### Future Enhancements
1. Add real-time notifications for match updates
2. Implement email notifications for tournament events
3. Add tournament export/import functionality
4. Add player performance analytics dashboard

## Test Coverage Goals

### Current Coverage
- ✅ API Endpoints: 100% of tournament endpoints
- ✅ Tournament Types: All 3 types fully tested
- ✅ User Roles: All 4 roles tested
- ✅ Scoring System: Tennis rules validated
- ✅ Statistics: Reports generation tested

### Target Coverage
- 🎯 Unit Tests: 80%+ code coverage
- 🎯 Integration Tests: All critical paths
- 🎯 E2E Tests: Complete user journeys
- 🎯 Performance Tests: Load testing for 100+ tournaments

## Continuous Testing

### On Every Commit
```bash
npm test
```

### Before Deployment
```bash
npm test
node scripts/test-tournaments.js
# Manual smoke test of critical flows
```

### Weekly
- Full regression testing using TESTING_GUIDE.md
- Performance testing with larger datasets
- Cross-browser testing

## Bug Reporting

Use the bug report template in `TESTING_GUIDE.md`:
- Clear title and description
- Steps to reproduce
- Expected vs actual results
- Environment details
- Screenshots if applicable

## Test Automation Roadmap

### Phase 1 (Current) ✅
- Jest unit tests
- Quick health check script
- Manual testing guide

### Phase 2 (Future)
- Playwright E2E tests
- Visual regression tests
- Performance benchmarks

### Phase 3 (Future)
- CI/CD integration
- Automated regression suite
- Load testing with k6

## Success Criteria

Testing is considered complete when:
- ✅ All automated tests pass
- ✅ All manual scenarios completed without critical bugs
- ✅ All user roles tested and working
- ✅ All 3 tournament types functional
- ✅ Statistics and reports accurate
- ✅ No data integrity issues
- ✅ Performance acceptable (< 2s page loads)

## Contact & Support

For testing questions or bug reports:
- Check `TESTING_GUIDE.md` for manual test scenarios
- Run `node scripts/test-tournaments.js` for quick diagnostics
- Review `tournament-flows.test.ts` for automated test examples
- Document bugs using the provided template
