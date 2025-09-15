-- KMRL Train Scheduler Database Schema
-- PostgreSQL 14+

-- Create database extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop tables if they exist (for development)
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS routes CASCADE;
DROP TABLE IF EXISTS stations CASCADE;
DROP TABLE IF EXISTS trains CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'operator')),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Create user sessions table
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(255) NOT NULL,
    device_info JSONB,
    ip_address INET,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create stations table
CREATE TABLE stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ml VARCHAR(200), -- Malayalam name
    name_hi VARCHAR(200), -- Hindi name
    location POINT NOT NULL, -- PostGIS point for lat/lng
    address TEXT,
    facilities JSONB DEFAULT '[]', -- Parking, escalator, etc.
    is_active BOOLEAN DEFAULT TRUE,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trains table
CREATE TABLE trains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ml VARCHAR(200),
    name_hi VARCHAR(200),
    type VARCHAR(20) DEFAULT 'metro' CHECK (type IN ('metro', 'feeder')),
    capacity INTEGER NOT NULL DEFAULT 300,
    facilities JSONB DEFAULT '[]', -- AC, Wi-Fi, etc.
    is_active BOOLEAN DEFAULT TRUE,
    maintenance_schedule JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create routes table
CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    name_ml VARCHAR(200),
    name_hi VARCHAR(200),
    description TEXT,
    color VARCHAR(7), -- Hex color code
    direction VARCHAR(20) CHECK (direction IN ('up', 'down', 'circular')),
    is_active BOOLEAN DEFAULT TRUE,
    total_distance DECIMAL(10, 2), -- in kilometers
    estimated_duration INTEGER, -- in minutes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create route_stations junction table
CREATE TABLE route_stations (
    route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
    station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    distance_from_start DECIMAL(10, 2) DEFAULT 0,
    travel_time_from_previous INTEGER DEFAULT 0, -- in seconds
    PRIMARY KEY (route_id, station_id)
);

-- Create schedules table
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    train_id UUID REFERENCES trains(id) ON DELETE CASCADE,
    route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
    departure_station UUID REFERENCES stations(id),
    arrival_station UUID REFERENCES stations(id),
    departure_time TIME NOT NULL,
    arrival_time TIME NOT NULL,
    frequency INTEGER DEFAULT 300, -- seconds between trains
    days_of_week INTEGER[] DEFAULT '{1,2,3,4,5,6,7}', -- 1=Monday, 7=Sunday
    valid_from DATE NOT NULL,
    valid_until DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'delayed', 'maintenance')),
    delay_minutes INTEGER DEFAULT 0,
    available_seats INTEGER,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create bookings table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES schedules(id),
    booking_reference VARCHAR(20) UNIQUE NOT NULL,
    passenger_count INTEGER DEFAULT 1,
    passenger_details JSONB NOT NULL, -- Array of passenger info
    departure_station UUID REFERENCES stations(id),
    arrival_station UUID REFERENCES stations(id),
    journey_date DATE NOT NULL,
    departure_time TIME NOT NULL,
    seat_numbers TEXT[], -- Array of seat numbers if applicable
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    booking_status VARCHAR(20) DEFAULT 'confirmed' CHECK (booking_status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
    qr_code TEXT, -- Base64 encoded QR code
    cancellation_reason TEXT,
    refund_amount DECIMAL(10, 2),
    booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error', 'booking', 'schedule_change')),
    data JSONB, -- Additional data like booking_id, schedule_id
    is_read BOOLEAN DEFAULT FALSE,
    delivery_status VARCHAR(20) DEFAULT 'sent' CHECK (delivery_status IN ('pending', 'sent', 'failed')),
    delivery_method VARCHAR(20) DEFAULT 'push' CHECK (delivery_method IN ('push', 'email', 'sms')),
    scheduled_for TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create system settings table
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    is_public BOOLEAN DEFAULT FALSE, -- Whether frontend can access
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_deleted ON users(deleted_at);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(refresh_token);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

CREATE INDEX idx_stations_code ON stations(code);
CREATE INDEX idx_stations_active ON stations(is_active);
CREATE INDEX idx_stations_location ON stations USING GIST(location);

CREATE INDEX idx_trains_number ON trains(number);
CREATE INDEX idx_trains_active ON trains(is_active);

CREATE INDEX idx_routes_active ON routes(is_active);

CREATE INDEX idx_schedules_train_route ON schedules(train_id, route_id);
CREATE INDEX idx_schedules_departure_time ON schedules(departure_time);
CREATE INDEX idx_schedules_status ON schedules(status);
CREATE INDEX idx_schedules_valid_period ON schedules(valid_from, valid_until);

CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_schedule_id ON bookings(schedule_id);
CREATE INDEX idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX idx_bookings_journey_date ON bookings(journey_date);
CREATE INDEX idx_bookings_status ON bookings(booking_status);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for);

CREATE INDEX idx_system_settings_key ON system_settings(key);
CREATE INDEX idx_system_settings_category ON system_settings(category);
CREATE INDEX idx_system_settings_public ON system_settings(is_public);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stations_updated_at BEFORE UPDATE ON stations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trains_updated_at BEFORE UPDATE ON trains
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON routes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial system settings
INSERT INTO system_settings (key, value, description, category, is_public) VALUES
('app_name', '"KMRL Train Scheduler"', 'Application name', 'general', true),
('app_version', '"1.0.0"', 'Application version', 'general', true),
('maintenance_mode', 'false', 'Enable/disable maintenance mode', 'general', true),
('booking_window_days', '30', 'How many days in advance can users book', 'booking', true),
('cancellation_window_hours', '24', 'Hours before departure when cancellation is allowed', 'booking', true),
('max_passengers_per_booking', '6', 'Maximum passengers per booking', 'booking', true),
('supported_languages', '["en", "ml", "hi"]', 'Supported application languages', 'general', true),
('default_language', '"en"', 'Default application language', 'general', true),
('customer_support_email', '"support@kmrl.com"', 'Customer support email', 'contact', true),
('customer_support_phone', '"+91-484-2631287"', 'Customer support phone', 'contact', true);

-- Grant necessary permissions (adjust as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO kmrl_api_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO kmrl_api_user;