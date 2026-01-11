# Backend Fix Plan

## High Priority
- [ ] User stats endpoint - total bets, win rate, profit/loss, best streak
- [ ] Bet history endpoint with pagination and date filtering
- [ ] Leaderboard caching - weekly/monthly/all-time
- [ ] User rank lookup endpoint (get user's position in leaderboard)

## Medium Priority
- [ ] Notification system - store and retrieve user notifications
- [ ] Referral tracking - link referrals to users, track bonus distribution
- [ ] Analytics events - track user actions for insights
- [ ] Leaderboard by different metrics (profit, win rate, volume)

## Low Priority
- [ ] Admin dashboard endpoints for monitoring
- [ ] Rate limiting on sensitive endpoints
- [ ] Database query optimization
- [ ] Better error logging and monitoring

## Guidelines
- All endpoints should return proper error messages
- Use pagination for list endpoints (default 20, max 100)
- Cache frequently accessed data
- Write TypeScript types for all responses

## Notes
- Focus on user-facing features first
- Keep socket emissions efficient
- Test endpoints before marking complete
