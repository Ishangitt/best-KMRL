import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export class AuthController {
  register = async (req: Request, res: Response) => {
    try {
      const { email, password, first_name, last_name, phone_number, date_of_birth, gender } = req.body;

      // Check if user already exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Create new user
      const user = await UserModel.create({
        email,
        password,
        first_name,
        last_name,
        phone_number,
        date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,
        gender
      });

      // Generate verification token (in a real app, you'd send this via email)
      const verificationToken = crypto.randomBytes(32).toString('hex');
      
      // For demo purposes, we'll auto-verify users
      await UserModel.setVerified(user.id);
      
      // Generate JWT tokens
      const accessToken = UserModel.generateJWT(user);
      const refreshToken = UserModel.generateRefreshToken(user);

      logger.info(`User registered successfully: ${email}`);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            phone_number: user.phone_number,
            role: user.role,
            is_verified: true // Auto-verified for demo
          },
          tokens: {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: process.env.JWT_EXPIRES_IN || '24h'
          }
        }
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check if account is deleted
      if (user.deleted_at) {
        return res.status(401).json({
          success: false,
          message: 'Account has been deactivated'
        });
      }

      // Verify password
      const isPasswordValid = await UserModel.verifyPassword(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check if email is verified
      if (!user.is_verified) {
        return res.status(403).json({
          success: false,
          message: 'Please verify your email before logging in'
        });
      }

      // Generate JWT tokens
      const accessToken = UserModel.generateJWT(user);
      const refreshToken = UserModel.generateRefreshToken(user);

      logger.info(`User logged in successfully: ${email}`);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            phone_number: user.phone_number,
            role: user.role,
            is_verified: user.is_verified
          },
          tokens: {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: process.env.JWT_EXPIRES_IN || '24h'
          }
        }
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  };

  logout = async (req: AuthRequest, res: Response) => {
    try {
      // In a complete implementation, you'd blacklist the token
      // For now, we'll just return success
      logger.info(`User logged out: ${req.user?.email}`);
      
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  };

  refreshToken = async (req: Request, res: Response) => {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      // Verify refresh token
      const decoded = jwt.verify(
        refresh_token, 
        process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret'
      ) as any;

      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token type'
        });
      }

      // Find user
      const user = await UserModel.findById(decoded.id);
      if (!user || !user.is_verified) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }

      // Generate new tokens
      const newAccessToken = UserModel.generateJWT(user);
      const newRefreshToken = UserModel.generateRefreshToken(user);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          tokens: {
            access_token: newAccessToken,
            refresh_token: newRefreshToken,
            expires_in: process.env.JWT_EXPIRES_IN || '24h'
          }
        }
      });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token expired'
        });
      }

      logger.error('Token refresh error:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
  };

  verifyEmail = async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      // In a real implementation, you'd verify the token from the database
      // For demo purposes, we'll just return success
      res.json({
        success: true,
        message: 'Email verified successfully'
      });
    } catch (error) {
      logger.error('Email verification error:', error);
      res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }
  };

  forgotPassword = async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      const user = await UserModel.findByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not
        return res.json({
          success: true,
          message: 'If the email exists, a password reset link has been sent'
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 3600000); // 1 hour

      await UserModel.setPasswordResetToken(email, resetToken, expires);

      // In a real app, you'd send an email with the reset link
      logger.info(`Password reset requested for: ${email}`);

      res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
        // For demo purposes, include the reset token
        reset_token: process.env.NODE_ENV === 'development' ? resetToken : undefined
      });
    } catch (error) {
      logger.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process password reset request'
      });
    }
  };

  resetPassword = async (req: Request, res: Response) => {
    try {
      const { token, new_password } = req.body;

      // Find user by reset token
      const user = await UserModel.findByResetToken(token);
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
      }

      // Update password
      await UserModel.changePassword(user.id, new_password);

      // Clear reset token
      await UserModel.setPasswordResetToken(user.email, '', new Date());

      logger.info(`Password reset completed for: ${user.email}`);

      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      logger.error('Password reset error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset password'
      });
    }
  };

  getProfile = async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;
      
      res.json({
        success: true,
        data: {
          id: user?.id,
          email: user?.email,
          first_name: user?.first_name,
          last_name: user?.last_name,
          phone_number: user?.phone_number,
          date_of_birth: user?.date_of_birth,
          gender: user?.gender,
          role: user?.role,
          is_verified: user?.is_verified,
          preferences: user?.preferences,
          created_at: user?.created_at
        }
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profile'
      });
    }
  };

  updateProfile = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const updates = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const updatedUser = await UserModel.update(userId, updates);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          phone_number: updatedUser.phone_number,
          date_of_birth: updatedUser.date_of_birth,
          gender: updatedUser.gender,
          preferences: updatedUser.preferences
        }
      });
    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }
  };
}
