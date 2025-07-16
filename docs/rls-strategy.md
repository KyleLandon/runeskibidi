# Long-term RLS Policy Strategy for MMO Games

## Current Issue
Row Level Security (RLS) policies are blocking legitimate access during user registration, causing 406 errors and requiring complex fallback mechanisms.

## 🎯 Long-term Solutions

### 1. **Proper MMO-Specific RLS Policies** ⭐ (Recommended)

**What it does:**
- Allows users to read their own data (private)
- Allows users to read other players' public data (for multiplayer)  
- Prevents users from modifying other players' data
- Uses service role for system operations

**Benefits:**
- ✅ Secure and performant
- ✅ Designed for multiplayer games
- ✅ No complex fallback logic needed
- ✅ Proper separation of private vs public data

**Implementation:** `database/rls-policies-improved.sql`

### 2. **Service Role for Critical Operations**

**Pattern:**
```javascript
// For system operations, use service role client
const serviceClient = createClient(url, serviceKey) // service_role key

// For user operations, use anon client  
const userClient = createClient(url, anonKey) // anon key
```

**Use Cases:**
- User registration triggers
- Admin operations
- Batch data processing
- System-level game logic

### 3. **Data Access Patterns**

| Data Type | Read Access | Write Access | Example |
|-----------|-------------|--------------|---------|
| **Private Data** | Own only | Own only | Inventory, private messages |
| **Public Data** | Everyone | Own only | Character stats, username |
| **Shared Data** | Everyone | Everyone | Chat, world objects |
| **System Data** | Everyone | Service only | Items, skills definitions |

### 4. **Database Function Approach**

Instead of direct table access, use database functions for complex operations:

```sql
-- Example: Secure character creation function
CREATE OR REPLACE FUNCTION create_character(
    character_name TEXT,
    starting_x REAL DEFAULT 512,
    starting_y REAL DEFAULT 384
) RETURNS characters
SECURITY DEFINER -- Runs with function owner privileges
LANGUAGE plpgsql
AS $$
DECLARE
    new_character characters;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Create character with proper validation
    INSERT INTO characters (player_id, name, x, y, health, max_health, mana, max_mana)
    VALUES (auth.uid(), character_name, starting_x, starting_y, 100, 100, 50, 50)
    RETURNING * INTO new_character;
    
    RETURN new_character;
END;
$$;
```

**Benefits:**
- ✅ Complex business logic in database
- ✅ Atomic operations
- ✅ Better security control
- ✅ Reduced client-side complexity

## 🏗️ Architecture Patterns

### Option A: Hybrid Approach (Current + Improved)
```
Client (anon role) → RLS Policies → Database
     ↓
Service Functions (service role) → Direct Access → Database
```

**Pros:** Gradual migration, keeps existing code
**Cons:** More complex, two access patterns

### Option B: Function-First Approach  
```
Client → Database Functions → RLS Policies → Database
```

**Pros:** Centralized logic, better security, simpler client
**Cons:** More database functions to maintain

### Option C: Service Layer Approach
```
Client → API Service (service role) → Database
```

**Pros:** Maximum control, complex business logic
**Cons:** Requires separate backend service

## 🚀 Recommended Implementation Plan

### Phase 1: Fix Current Issues (Immediate)
1. ✅ Apply improved RLS policies (`rls-policies-improved.sql`)
2. ✅ Update trigger function with proper service role
3. ✅ Remove fallback logic from AuthManager
4. ✅ Test registration flow

### Phase 2: Optimize for Performance (1-2 weeks)
1. Create database functions for complex operations:
   - `create_character()`
   - `update_player_stats()`
   - `process_skill_gain()`
2. Update client code to use functions
3. Add proper indexing for multiplayer queries

### Phase 3: Advanced Features (1 month)
1. Implement proper real-time subscriptions with RLS
2. Add admin functions for game management
3. Create audit logging for sensitive operations
4. Implement rate limiting at database level

## 🔧 Quick Fixes for Common Issues

### Issue: "Cannot read player data after creation"
**Solution:** Use `SECURITY DEFINER` functions for system operations

### Issue: "Slow multiplayer queries"  
**Solution:** Optimize RLS policies with proper indexing
```sql
-- Example: Index for fast player lookups
CREATE INDEX idx_players_online_location ON players(is_online, last_login) 
WHERE is_online = true;
```

### Issue: "Complex permission logic"
**Solution:** Use database functions instead of client-side logic

## 📊 Performance Considerations

### RLS Policy Performance
- ✅ **Simple policies** (auth.uid() = user_id) are very fast
- ✅ **Indexed columns** in policies perform well
- ❌ **Complex logic** in policies can be slow
- ❌ **Functions in policies** should be avoided

### Monitoring
```sql
-- Check policy performance
SELECT 
    schemaname, tablename, policyname,
    n_tup_ins, n_tup_upd, n_tup_del
FROM pg_stat_user_tables 
JOIN pg_policies ON pg_stat_user_tables.tablename = pg_policies.tablename;
```

## 🛡️ Security Best Practices

1. **Principle of Least Privilege**
   - Only grant minimum necessary access
   - Use separate policies for read/write operations

2. **Input Validation**
   - Validate all user inputs in database functions
   - Use CHECK constraints for data integrity

3. **Audit Logging**
   - Log sensitive operations (admin actions, large transactions)
   - Monitor for suspicious access patterns

4. **Regular Security Reviews**
   - Review RLS policies quarterly
   - Test with different user scenarios
   - Monitor for performance regressions

## 🎮 MMO-Specific Considerations

### Real-time Features
- Use RLS-aware real-time subscriptions
- Filter sensitive data in real-time updates
- Consider caching for frequently accessed data

### Scaling
- Use read replicas for player discovery
- Implement proper connection pooling
- Consider data partitioning for large player bases

### Game Balance
- Use database functions for game logic
- Implement server-side validation for all actions
- Prevent client-side manipulation

---

**Next Steps:** Apply the improved RLS policies and test the registration flow! 