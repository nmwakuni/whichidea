-- White-Label Savings Gamification Platform
-- Database Schema v1.0
-- PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom types
CREATE TYPE organization_type AS ENUM ('chama', 'sacco', 'mfi', 'bank', 'ngo');
CREATE TYPE subscription_tier AS ENUM ('starter', 'growth', 'enterprise', 'custom');
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'past_due', 'canceled', 'paused');
CREATE TYPE user_role AS ENUM ('super_admin', 'org_admin', 'member');
CREATE TYPE challenge_type AS ENUM ('fixed_amount', 'percentage_increase', 'streak', 'group');
CREATE TYPE challenge_status AS ENUM ('draft', 'active', 'completed', 'cancelled');
CREATE TYPE participation_status AS ENUM ('active', 'completed', 'failed', 'withdrawn');
CREATE TYPE transaction_status AS ENUM ('pending', 'verified', 'failed', 'refunded');
CREATE TYPE notification_type AS ENUM ('sms', 'whatsapp', 'push', 'email');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'delivered');
CREATE TYPE achievement_rarity AS ENUM ('common', 'rare', 'epic', 'legendary');

-- ============================================================================
-- ORGANIZATIONS
-- ============================================================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Basic info
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    type organization_type NOT NULL,
    description TEXT,

    -- Contact
    phone_number VARCHAR(20),
    email VARCHAR(255),

    -- Branding (JSON)
    branding JSONB DEFAULT '{
        "logo_url": null,
        "primary_color": "#3B82F6",
        "secondary_color": "#10B981",
        "accent_color": "#F59E0B"
    }'::jsonb,

    -- Subscription
    subscription_tier subscription_tier NOT NULL DEFAULT 'starter',
    subscription_status subscription_status NOT NULL DEFAULT 'trial',
    trial_ends_at TIMESTAMP,
    subscription_started_at TIMESTAMP,

    -- M-Pesa Configuration (encrypted)
    mpesa_config JSONB, -- { paybill: "", shortcode: "", consumer_key: "", consumer_secret: "" }

    -- Settings
    settings JSONB DEFAULT '{
        "allow_manual_transactions": true,
        "require_transaction_approval": false,
        "notifications_enabled": true,
        "currency": "KES"
    }'::jsonb,

    -- Stats (denormalized for performance)
    total_members INTEGER DEFAULT 0,
    total_challenges INTEGER DEFAULT 0,
    total_savings DECIMAL(15,2) DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP -- Soft delete
);

-- Indexes
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_status ON organizations(subscription_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_type ON organizations(type);

-- ============================================================================
-- USERS
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Identity
    phone_number VARCHAR(20) NOT NULL,
    phone_verified BOOLEAN DEFAULT FALSE,
    email VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,

    -- Profile
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url VARCHAR(500),

    -- Auth
    role user_role NOT NULL DEFAULT 'member',
    password_hash VARCHAR(255), -- For admin users

    -- Preferences
    preferences JSONB DEFAULT '{
        "notifications_sms": true,
        "notifications_whatsapp": false,
        "notifications_email": false,
        "language": "en"
    }'::jsonb,

    -- Stats (denormalized)
    total_saved DECIMAL(15,2) DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    challenges_completed INTEGER DEFAULT 0,

    -- Metadata
    last_active_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Indexes
CREATE UNIQUE INDEX idx_users_phone_org ON users(phone_number, organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_org ON users(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;

-- ============================================================================
-- CHALLENGES
-- ============================================================================

CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),

    -- Basic info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type challenge_type NOT NULL,
    status challenge_status NOT NULL DEFAULT 'draft',

    -- Challenge configuration (JSON based on type)
    target JSONB NOT NULL,
    -- Examples:
    -- Fixed amount: { "amount": 1000, "frequency": "weekly", "duration_weeks": 12 }
    -- Percentage: { "increase_percentage": 10, "baseline_period": "last_month" }
    -- Streak: { "consecutive_weeks": 12, "min_amount_per_week": 500 }
    -- Group: { "team_size": 5, "team_target": 50000, "duration_weeks": 8 }

    -- Timing
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_days INTEGER GENERATED ALWAYS AS (end_date - start_date) STORED,

    -- Gamification
    points_per_kes DECIMAL(5,2) DEFAULT 1.0,
    streak_multiplier DECIMAL(3,2) DEFAULT 1.5,
    completion_bonus INTEGER DEFAULT 1000,

    -- Rules
    rules JSONB DEFAULT '{
        "min_transaction_amount": 100,
        "max_participants": null,
        "allow_teams": false,
        "private": false
    }'::jsonb,

    -- Stats (denormalized)
    participants_count INTEGER DEFAULT 0,
    total_saved DECIMAL(15,2) DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0,

    -- Metadata
    published_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_challenges_org ON challenges(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_challenges_status ON challenges(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_challenges_dates ON challenges(start_date, end_date);
CREATE INDEX idx_challenges_type ON challenges(type);

-- ============================================================================
-- TEAMS (for group challenges)
-- ============================================================================

CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,

    -- Info
    name VARCHAR(100) NOT NULL,
    description TEXT,
    avatar_url VARCHAR(500),

    -- Captain/leader
    captain_id UUID REFERENCES users(id),

    -- Stats
    member_count INTEGER DEFAULT 0,
    total_saved DECIMAL(15,2) DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    rank INTEGER,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_teams_challenge ON teams(challenge_id);
CREATE INDEX idx_teams_rank ON teams(rank);

-- ============================================================================
-- CHALLENGE PARTICIPANTS
-- ============================================================================

CREATE TABLE challenge_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,

    -- Status
    status participation_status NOT NULL DEFAULT 'active',

    -- Progress tracking
    progress JSONB DEFAULT '{
        "current_amount": 0,
        "current_streak": 0,
        "weeks_completed": 0,
        "transactions_count": 0,
        "last_transaction_date": null
    }'::jsonb,

    -- Stats
    total_contributed DECIMAL(15,2) DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    rank INTEGER,

    -- Achievements
    badges_earned INTEGER DEFAULT 0,

    -- Timing
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    withdrawn_at TIMESTAMP,

    -- Metadata
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(challenge_id, user_id)
);

-- Indexes
CREATE INDEX idx_participants_challenge ON challenge_participants(challenge_id, rank);
CREATE INDEX idx_participants_user ON challenge_participants(user_id);
CREATE INDEX idx_participants_status ON challenge_participants(status);
CREATE INDEX idx_participants_team ON challenge_participants(team_id) WHERE team_id IS NOT NULL;

-- ============================================================================
-- TRANSACTIONS
-- ============================================================================

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    challenge_id UUID REFERENCES challenges(id) ON DELETE SET NULL,

    -- Transaction details
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KES',

    -- M-Pesa details
    mpesa_receipt_number VARCHAR(50),
    mpesa_transaction_id VARCHAR(50),
    phone_number VARCHAR(20),

    -- Status
    status transaction_status NOT NULL DEFAULT 'pending',

    -- Verification
    verified_by UUID REFERENCES users(id), -- If manually verified
    verified_at TIMESTAMP,

    -- Points awarded
    points_awarded INTEGER DEFAULT 0,

    -- Source
    source VARCHAR(50) DEFAULT 'mpesa', -- 'mpesa', 'manual', 'bulk_upload'

    -- Metadata
    metadata JSONB, -- Store full M-Pesa callback data
    notes TEXT,

    -- Timing
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_transactions_user ON transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_org ON transactions(organization_id, transaction_date DESC);
CREATE INDEX idx_transactions_challenge ON transactions(challenge_id) WHERE challenge_id IS NOT NULL;
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_mpesa ON transactions(mpesa_receipt_number) WHERE mpesa_receipt_number IS NOT NULL;
CREATE INDEX idx_transactions_date ON transactions(transaction_date);

-- ============================================================================
-- ACHIEVEMENTS / BADGES
-- ============================================================================

CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL = system-wide

    -- Info
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(100), -- Emoji or icon name
    rarity achievement_rarity NOT NULL DEFAULT 'common',

    -- Unlock criteria (JSON)
    criteria JSONB NOT NULL,
    -- Examples:
    -- { "type": "first_save", "min_amount": 100 }
    -- { "type": "streak", "days": 7 }
    -- { "type": "total_saved", "amount": 10000 }
    -- { "type": "challenges_completed", "count": 5 }
    -- { "type": "rank", "position": 1, "challenge_id": "..." }

    -- Display order
    sort_order INTEGER DEFAULT 0,

    -- Stats
    times_awarded INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_achievements_org ON achievements(organization_id);
CREATE INDEX idx_achievements_rarity ON achievements(rarity);

-- ============================================================================
-- USER ACHIEVEMENTS
-- ============================================================================

CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES challenges(id) ON DELETE SET NULL,

    -- Progress (for progressive achievements)
    progress JSONB,

    -- Timing
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id, earned_at DESC);
CREATE INDEX idx_user_achievements_achievement ON user_achievements(achievement_id);

-- ============================================================================
-- LEADERBOARD (Materialized View)
-- ============================================================================

CREATE TABLE leaderboard (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Rankings
    rank INTEGER NOT NULL,
    previous_rank INTEGER,

    -- Scores
    total_saved DECIMAL(15,2) DEFAULT 0,
    total_points INTEGER DEFAULT 0,

    -- Calculated at
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(challenge_id, user_id)
);

CREATE INDEX idx_leaderboard_challenge_rank ON leaderboard(challenge_id, rank);
CREATE INDEX idx_leaderboard_user ON leaderboard(user_id);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL = broadcast

    -- Content
    type notification_type NOT NULL,
    title VARCHAR(255),
    message TEXT NOT NULL,

    -- Delivery
    status notification_status NOT NULL DEFAULT 'pending',
    phone_number VARCHAR(20), -- For SMS/WhatsApp
    email VARCHAR(255), -- For email

    -- Provider response
    provider_id VARCHAR(100), -- External provider message ID
    provider_response JSONB,

    -- Related entities
    challenge_id UUID REFERENCES challenges(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,

    -- Timing
    scheduled_for TIMESTAMP,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_notifications_org ON notifications(organization_id, created_at DESC);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for) WHERE status = 'pending';

-- ============================================================================
-- EVENTS (for analytics)
-- ============================================================================

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Event details
    event_type VARCHAR(100) NOT NULL, -- 'challenge_joined', 'transaction_completed', etc.
    properties JSONB,

    -- Context
    session_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,

    -- Timing
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes (for analytics queries)
CREATE INDEX idx_events_org_type_date ON events(organization_id, event_type, created_at DESC);
CREATE INDEX idx_events_user_date ON events(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_date ON events(created_at DESC);

-- Partition by month for better performance (optional, for scale)
-- ALTER TABLE events PARTITION BY RANGE (created_at);

-- ============================================================================
-- OTP VERIFICATION (for phone auth)
-- ============================================================================

CREATE TABLE otp_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,

    -- Status
    verified BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,

    -- Expiry
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_otp_phone ON otp_verifications(phone_number, created_at DESC);
CREATE INDEX idx_otp_expiry ON otp_verifications(expires_at) WHERE verified = FALSE;

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Action
    action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'login', etc.
    resource_type VARCHAR(50) NOT NULL, -- 'challenge', 'user', 'transaction', etc.
    resource_id UUID,

    -- Changes
    old_values JSONB,
    new_values JSONB,

    -- Context
    ip_address INET,
    user_agent TEXT,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_org_date ON audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_user_date ON audit_logs(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_challenges_updated_at BEFORE UPDATE ON challenges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_participants_updated_at BEFORE UPDATE ON challenge_participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA (System achievements)
-- ============================================================================

INSERT INTO achievements (id, organization_id, name, description, icon, rarity, criteria, sort_order) VALUES
    (uuid_generate_v4(), NULL, 'First Steps', 'Made your first savings deposit', '🎯', 'common', '{"type": "first_save"}', 1),
    (uuid_generate_v4(), NULL, 'Week Warrior', 'Saved for 7 consecutive days', '🔥', 'common', '{"type": "streak", "days": 7}', 2),
    (uuid_generate_v4(), NULL, 'Month Master', 'Saved for 30 consecutive days', '💪', 'rare', '{"type": "streak", "days": 30}', 3),
    (uuid_generate_v4(), NULL, 'Champion', 'Completed your first challenge', '🏆', 'common', '{"type": "challenges_completed", "count": 1}', 4),
    (uuid_generate_v4(), NULL, 'Overachiever', 'Completed 5 challenges', '🌟', 'rare', '{"type": "challenges_completed", "count": 5}', 5),
    (uuid_generate_v4(), NULL, 'Top Dog', 'Ranked #1 in any challenge', '👑', 'epic', '{"type": "rank", "position": 1}', 6),
    (uuid_generate_v4(), NULL, 'Money Moves', 'Saved 10,000 KES total', '💰', 'rare', '{"type": "total_saved", "amount": 10000}', 7),
    (uuid_generate_v4(), NULL, 'Big Saver', 'Saved 100,000 KES total', '💎', 'epic', '{"type": "total_saved", "amount": 100000}', 8),
    (uuid_generate_v4(), NULL, 'Consistency King', 'Maintained 3-month streak', '⚡', 'epic', '{"type": "streak", "days": 90}', 9),
    (uuid_generate_v4(), NULL, 'Legend', 'Saved for 1 year straight', '🎖️', 'legendary', '{"type": "streak", "days": 365}', 10);

-- ============================================================================
-- VIEWS (for common queries)
-- ============================================================================

-- Active challenges with participant count
CREATE VIEW active_challenges_summary AS
SELECT
    c.*,
    COUNT(DISTINCT cp.user_id) as active_participants,
    SUM(cp.total_contributed) as total_contributions
FROM challenges c
LEFT JOIN challenge_participants cp ON c.id = cp.challenge_id AND cp.status = 'active'
WHERE c.status = 'active' AND c.deleted_at IS NULL
GROUP BY c.id;

-- User stats summary
CREATE VIEW user_stats_summary AS
SELECT
    u.id,
    u.organization_id,
    u.first_name,
    u.last_name,
    u.total_saved,
    u.total_points,
    u.challenges_completed,
    COUNT(DISTINCT cp.challenge_id) as active_challenges,
    COUNT(DISTINCT ua.achievement_id) as badges_earned
FROM users u
LEFT JOIN challenge_participants cp ON u.id = cp.user_id AND cp.status = 'active'
LEFT JOIN user_achievements ua ON u.id = ua.user_id
WHERE u.deleted_at IS NULL
GROUP BY u.id;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE organizations IS 'Financial institutions using the platform (Chamas, Saccos, etc.)';
COMMENT ON TABLE users IS 'Both admins and members of organizations';
COMMENT ON TABLE challenges IS 'Savings challenges created by organizations';
COMMENT ON TABLE teams IS 'Teams for group challenges';
COMMENT ON TABLE challenge_participants IS 'User participation in challenges';
COMMENT ON TABLE transactions IS 'Savings transactions (M-Pesa deposits)';
COMMENT ON TABLE achievements IS 'Badges/achievements that can be earned';
COMMENT ON TABLE user_achievements IS 'Achievements earned by users';
COMMENT ON TABLE leaderboard IS 'Cached leaderboard rankings';
COMMENT ON TABLE notifications IS 'SMS/WhatsApp/Push notifications';
COMMENT ON TABLE events IS 'Analytics events for tracking user behavior';
COMMENT ON TABLE otp_verifications IS 'OTP codes for phone verification';
COMMENT ON TABLE audit_logs IS 'Audit trail for important actions';

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

-- For production, consider:
-- 1. Partitioning events and audit_logs by month
-- 2. Moving leaderboard to Redis for real-time updates
-- 3. Creating materialized views for complex analytics queries
-- 4. Setting up read replicas for reporting queries
-- 5. Implementing connection pooling (PgBouncer)
