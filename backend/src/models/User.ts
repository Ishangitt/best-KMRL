import { query } from '../config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export interface User {
  id: string;
  email: string;
  phone_number?: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  date_of_birth?: Date;
  gender?: 'male' | 'female' | 'other';
  role: 'user' | 'admin' | 'operator';
  is_verified: boolean;
  verification_token?: string;
  password_reset_token?: string;
  password_reset_expires?: Date;
  preferences: any;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export class UserModel {
  static async create(userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    date_of_birth?: Date;
    gender?: 'male' | 'female' | 'other';
  }): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    
    const result = await query(
      `INSERT INTO users (
        email, password_hash, first_name, last_name, phone_number, 
        date_of_birth, gender, preferences
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING id, email, first_name, last_name, phone_number, 
               date_of_birth, gender, role, is_verified, preferences, 
               created_at, updated_at`,
      [
        userData.email.toLowerCase(),
        hashedPassword,
        userData.first_name,
        userData.last_name,
        userData.phone_number,
        userData.date_of_birth,
        userData.gender,
        JSON.stringify({})
      ]
    );

    return result.rows[0];
  }

  static async findByEmail(email: string): Promise<User | null> {
    const result = await query(
      'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email.toLowerCase()]
    );
    
    return result.rows[0] || null;
  }

  static async findById(id: string): Promise<User | null> {
    const result = await query(
      'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    return result.rows[0] || null;
  }

  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static async update(id: string, updates: Partial<User>): Promise<User> {
    const allowedFields = ['first_name', 'last_name', 'phone_number', 'date_of_birth', 'gender', 'preferences'];
    const updateFields = Object.keys(updates).filter(key => allowedFields.includes(key));
    
    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    const setClause = updateFields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const values = [id, ...updateFields.map(field => updates[field as keyof User])];

    const result = await query(
      `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND deleted_at IS NULL 
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  static async changePassword(id: string, newPassword: string): Promise<boolean> {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    const result = await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, id]
    );

    return result.rowCount > 0;
  }

  static async setVerified(id: string): Promise<boolean> {
    const result = await query(
      'UPDATE users SET is_verified = true, verification_token = null, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    return result.rowCount > 0;
  }

  static async setPasswordResetToken(email: string, token: string, expires: Date): Promise<boolean> {
    const result = await query(
      `UPDATE users SET password_reset_token = $1, password_reset_expires = $2, 
       updated_at = CURRENT_TIMESTAMP WHERE email = $3`,
      [token, expires, email.toLowerCase()]
    );

    return result.rowCount > 0;
  }

  static async findByResetToken(token: string): Promise<User | null> {
    const result = await query(
      `SELECT * FROM users WHERE password_reset_token = $1 
       AND password_reset_expires > CURRENT_TIMESTAMP 
       AND deleted_at IS NULL`,
      [token]
    );
    
    return result.rows[0] || null;
  }

  static generateJWT(user: User): string {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name
    };

    return jwt.sign(
      payload,
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
  }

  static generateRefreshToken(user: User): string {
    const payload = {
      id: user.id,
      email: user.email,
      type: 'refresh'
    };

    return jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
  }

  static async delete(id: string): Promise<boolean> {
    const result = await query(
      'UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    return result.rowCount > 0;
  }

  static async list(page: number = 1, limit: number = 10): Promise<{ users: User[], total: number }> {
    const offset = (page - 1) * limit;

    const [usersResult, countResult] = await Promise.all([
      query(
        `SELECT id, email, first_name, last_name, phone_number, role, 
                is_verified, created_at, updated_at
         FROM users 
         WHERE deleted_at IS NULL 
         ORDER BY created_at DESC 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      query('SELECT COUNT(*) FROM users WHERE deleted_at IS NULL')
    ]);

    return {
      users: usersResult.rows,
      total: parseInt(countResult.rows[0].count)
    };
  }
}