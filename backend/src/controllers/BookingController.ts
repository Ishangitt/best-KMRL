import { Request, Response } from 'express';
import { BookingModel } from '../models/Booking';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth';

export class BookingController {
  // Create new booking
  createBooking = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
      }

      const bookingData = req.body;
      const booking = await BookingModel.create(userId, bookingData);

      logger.info(`Booking created: ${booking.booking_reference} by user ${req.user?.email}`);

      res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        data: { booking }
      });
    } catch (error) {
      logger.error('Create booking error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('not enough seats')) {
          return res.status(400).json({
            success: false,
            message: error.message
          });
        }
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create booking'
      });
    }
  };

  // Get user's bookings
  getUserBookings = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
      }

      const { page = '1', limit = '10' } = req.query;
      const result = await BookingModel.findByUserId(
        userId,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: {
          bookings: result.bookings,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: result.total,
            pages: Math.ceil(result.total / parseInt(limit as string))
          }
        }
      });
    } catch (error) {
      logger.error('Get user bookings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve bookings'
      });
    }
  };

  // Get booking by ID
  getBooking = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const booking = await BookingModel.findById(id, userId);

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      res.json({
        success: true,
        data: { booking }
      });
    } catch (error) {
      logger.error('Get booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve booking'
      });
    }
  };

  // Get booking by reference
  getBookingByReference = async (req: Request, res: Response) => {
    try {
      const { reference } = req.params;

      const booking = await BookingModel.findByReference(reference);

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      res.json({
        success: true,
        data: { booking }
      });
    } catch (error) {
      logger.error('Get booking by reference error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve booking'
      });
    }
  };

  // Cancel booking
  cancelBooking = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
      }

      const cancelled = await BookingModel.cancelBooking(id, userId, reason);

      if (!cancelled) {
        return res.status(400).json({
          success: false,
          message: 'Failed to cancel booking'
        });
      }

      logger.info(`Booking ${id} cancelled by user ${req.user?.email}`);

      res.json({
        success: true,
        message: 'Booking cancelled successfully'
      });
    } catch (error) {
      logger.error('Cancel booking error:', error);
      
      if (error instanceof Error) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to cancel booking'
      });
    }
  };

  // Update payment status (for payment gateway webhooks)
  updatePaymentStatus = async (req: Request, res: Response) => {
    try {
      const { booking_id, payment_status, payment_reference } = req.body;

      if (!booking_id || !payment_status) {
        return res.status(400).json({
          success: false,
          message: 'Booking ID and payment status are required'
        });
      }

      if (!['pending', 'paid', 'failed', 'refunded'].includes(payment_status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment status'
        });
      }

      const updated = await BookingModel.updatePaymentStatus(
        booking_id,
        payment_status,
        payment_reference
      );

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      logger.info(`Payment status updated for booking ${booking_id}: ${payment_status}`);

      res.json({
        success: true,
        message: 'Payment status updated successfully'
      });
    } catch (error) {
      logger.error('Update payment status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update payment status'
      });
    }
  };

  // Simulate payment (for demo purposes)
  simulatePayment = async (req: AuthRequest, res: Response) => {
    try {
      const { booking_id, payment_method = 'card' } = req.body;
      const userId = req.user?.id;

      if (!booking_id) {
        return res.status(400).json({
          success: false,
          message: 'Booking ID is required'
        });
      }

      // Verify booking belongs to user
      const booking = await BookingModel.findById(booking_id, userId);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      if (booking.payment_status === 'paid') {
        return res.status(400).json({
          success: false,
          message: 'Booking is already paid'
        });
      }

      // Simulate payment processing (90% success rate)
      const paymentSuccess = Math.random() > 0.1;
      const paymentReference = `PAY_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const paymentStatus = paymentSuccess ? 'paid' : 'failed';
      await BookingModel.updatePaymentStatus(booking_id, paymentStatus, paymentReference);

      logger.info(`Payment simulation for booking ${booking_id}: ${paymentStatus}`);

      res.json({
        success: paymentSuccess,
        message: paymentSuccess ? 'Payment successful' : 'Payment failed - please try again',
        data: {
          booking_id,
          payment_status: paymentStatus,
          payment_reference: paymentSuccess ? paymentReference : undefined,
          amount: booking.total_amount
        }
      });
    } catch (error) {
      logger.error('Simulate payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Payment processing failed'
      });
    }
  };

  // Get booking statistics for user
  getBookingStats = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
      }

      const stats = await BookingModel.getBookingStats(userId);

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      logger.error('Get booking stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve booking statistics'
      });
    }
  };
}