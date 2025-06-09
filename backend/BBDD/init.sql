-- init.sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0
);

CREATE TABLE user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    font_size VARCHAR(10) DEFAULT '16',
    font_family VARCHAR(50) DEFAULT 'Arial',
    text_color VARCHAR(7) DEFAULT '#000000',
    background_color VARCHAR(7) DEFAULT '#ffffff',
    rate VARCHAR(10) DEFAULT '1',
    pitch VARCHAR(10) DEFAULT '1',
    volume VARCHAR(10) DEFAULT '1'
);

INSERT INTO users (username, hashed_password, is_admin)
VALUES (
    'adminadmin',
    '$2b$12$rrTwPPDSDRTeMEUhUVOYTuec1WIPJ6lYvtdO8WNg.3sS0iWWWZJDm', -- hash de 'adminadmin' con bcrypt
    1
);

INSERT INTO user_settings (user_id) 
SELECT id FROM users WHERE username = 'adminadmin'
ON CONFLICT DO NOTHING;