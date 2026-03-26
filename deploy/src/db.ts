import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("railway") ? { rejectUnauthorized: false } : false,
});

export async function setupDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS economy (
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      balance INTEGER DEFAULT 0,
      last_daily BIGINT DEFAULT 0,
      PRIMARY KEY (user_id, guild_id)
    );

    CREATE TABLE IF NOT EXISTS xp (
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, guild_id)
    );

    CREATE TABLE IF NOT EXISTS invites (
      inviter_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      invite_count INTEGER DEFAULT 0,
      PRIMARY KEY (inviter_id, guild_id)
    );

    CREATE TABLE IF NOT EXISTS warnings (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );

    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      welcome_enabled BOOLEAN DEFAULT FALSE,
      welcome_channel TEXT,
      welcome_message TEXT DEFAULT 'Willkommen {user} auf {server}! Ihr seid Mitglied #{count}!',
      welcome_color TEXT DEFAULT '#5865F2',
      welcome_image TEXT,
      verify_enabled BOOLEAN DEFAULT FALSE,
      verify_role TEXT,
      verify_channel TEXT,
      verify_message TEXT,
      raid_enabled BOOLEAN DEFAULT FALSE,
      raid_threshold INTEGER DEFAULT 10,
      raid_window INTEGER DEFAULT 10,
      raid_action TEXT DEFAULT 'kick',
      selectable_roles TEXT[] DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS role_panels (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      title TEXT NOT NULL,
      roles TEXT[] DEFAULT '{}'
    );
  `);
  console.log("✅ Datenbank bereit");
}

export async function getOrCreateEconomy(userId: string, guildId: string) {
  await pool.query(
    `INSERT INTO economy (user_id, guild_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [userId, guildId]
  );
  const res = await pool.query(
    `SELECT * FROM economy WHERE user_id = $1 AND guild_id = $2`,
    [userId, guildId]
  );
  return res.rows[0];
}

export async function getOrCreateXp(userId: string, guildId: string) {
  await pool.query(
    `INSERT INTO xp (user_id, guild_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [userId, guildId]
  );
  const res = await pool.query(
    `SELECT * FROM xp WHERE user_id = $1 AND guild_id = $2`,
    [userId, guildId]
  );
  return res.rows[0];
}

export async function getGuildSettings(guildId: string) {
  await pool.query(
    `INSERT INTO guild_settings (guild_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [guildId]
  );
  const res = await pool.query(
    `SELECT * FROM guild_settings WHERE guild_id = $1`,
    [guildId]
  );
  return res.rows[0];
}
