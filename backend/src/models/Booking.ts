import { query } from '../config/database';
import { ScheduleModel } from './Schedule';

export interface Booking {
  id: string;
  user_id: string;
  schedule_id: string;
  booking_reference: string;
  passenger_count: number;
  passenger_details: PassengerDetail[];
  departure_station: string;
  arrival_station: string;
  journey_date: Date;
  departure_time: string;
  seat_numbers?: string[];
  total_amount: number;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method?: string;
  payment_reference?: string;
  booking_status: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  qr_code?: string;
  cancellation_reason?: string;
  refund_amount?: number;
  booked_at: Date;
  cancelled_at?: Date;
  created_at: Date;
  updated_at: Date;
  
  // Joined fields
  user_name?: string;
  user_email?: string;
  train_name?: string;
  train_number?: string;
  departure_station_name?: string;
  arrival_station_name?: string;
  departure_station_code?: string;
  arrival_station_code?: string;
}

export interface PassengerDetail {
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  id_type?: 'aadhar' | 'pan' | 'passport' | 'driving_license';
  id_number?: string;
}

export interface BookingRequest {
  schedule_id: string;
  departure_station: string;
  arrival_station: string;
  journey_date: string;
  passengers: PassengerDetail[];
  payment_method?: string;
}

export class BookingModel {
  static async create(userId: string, bookingData: BookingRequest): Promise<Booking> {
    const client = await query('BEGIN', []);
    
    try {
      // Generate booking reference
      const bookingReference = this.generateBookingReference();
      
      // Get schedule details and check availability
      const schedule = await ScheduleModel.findById(bookingData.schedule_id);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      if (schedule.available_seats < bookingData.passengers.length) {
        throw new Error('Not enough seats available');
      }

      // Calculate total amount
      const totalAmount = schedule.price * bookingData.passengers.length;

      // Create booking record
      const result = await query(
        `INSERT INTO bookings (
          user_id, schedule_id, booking_reference, passenger_count,
          passenger_details, departure_station, arrival_station,
          journey_date, departure_time, total_amount, payment_method
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
        RETURNING *`,
        [
          userId,
          bookingData.schedule_id,
          bookingReference,
          bookingData.passengers.length,
          JSON.stringify(bookingData.passengers),
          bookingData.departure_station,
          bookingData.arrival_station,
          bookingData.journey_date,
          schedule.departure_time,
          totalAmount,
          bookingData.payment_method || 'online'
        ]
      );

      // Update available seats
      const seatsUpdated = await ScheduleModel.updateAvailableSeats(
        bookingData.schedule_id,
        -bookingData.passengers.length
      );

      if (!seatsUpdated) {
        throw new Error('Failed to update available seats');
      }

      await query('COMMIT', []);

      const booking = result.rows[0];
      booking.passenger_details = JSON.parse(booking.passenger_details);

      return booking;
    } catch (error) {
      await query('ROLLBACK', []);
      throw error;
    }
  }

  static async findById(id: string, userId?: string): Promise<Booking | null> {
    let userFilter = '';
    let queryParams: any[] = [id];

    if (userId) {
      userFilter = 'AND b.user_id = $2';
      queryParams.push(userId);
    }

    const result = await query(
      `SELECT 
        b.id, b.user_id, b.schedule_id, b.booking_reference, b.passenger_count,
        b.passenger_details, b.departure_station, b.arrival_station,
        b.journey_date, b.departure_time, b.seat_numbers, b.total_amount,
        b.payment_status, b.payment_method, b.payment_reference,
        b.booking_status, b.qr_code, b.cancellation_reason, b.refund_amount,
        b.booked_at, b.cancelled_at, b.created_at, b.updated_at,
        u.first_name || ' ' || u.last_name as user_name, u.email as user_email,
        t.name as train_name, t.number as train_number,
        ds.name as departure_station_name, ds.code as departure_station_code,
        as_.name as arrival_station_name, as_.code as arrival_station_code
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN schedules s ON b.schedule_id = s.id
       JOIN trains t ON s.train_id = t.id
       JOIN stations ds ON b.departure_station = ds.id
       JOIN stations as_ ON b.arrival_station = as_.id
       WHERE b.id = $1 ${userFilter}`,
      queryParams
    );

    if (result.rows.length === 0) return null;

    const booking = result.rows[0];
    booking.passenger_details = JSON.parse(booking.passenger_details);
    booking.seat_numbers = booking.seat_numbers || [];

    return booking;
  }

  static async findByReference(bookingReference: string): Promise<Booking | null> {
    const result = await query(
      `SELECT 
        b.id, b.user_id, b.schedule_id, b.booking_reference, b.passenger_count,
        b.passenger_details, b.departure_station, b.arrival_station,
        b.journey_date, b.departure_time, b.seat_numbers, b.total_amount,
        b.payment_status, b.payment_method, b.payment_reference,
        b.booking_status, b.qr_code, b.cancellation_reason, b.refund_amount,
        b.booked_at, b.cancelled_at, b.created_at, b.updated_at,
        u.first_name || ' ' || u.last_name as user_name, u.email as user_email,
        t.name as train_name, t.number as train_number,
        ds.name as departure_station_name, ds.code as departure_station_code,
        as_.name as arrival_station_name, as_.code as arrival_station_code
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN schedules s ON b.schedule_id = s.id
       JOIN trains t ON s.train_id = t.id
       JOIN stations ds ON b.departure_station = ds.id
       JOIN stations as_ ON b.arrival_station = as_.id
       WHERE b.booking_reference = $1`,
      [bookingReference]
    );

    if (result.rows.length === 0) return null;

    const booking = result.rows[0];
    booking.passenger_details = JSON.parse(booking.passenger_details);
    booking.seat_numbers = booking.seat_numbers || [];

    return booking;
  }

  static async findByUserId(userId: string, page: number = 1, limit: number = 10): Promise<{ bookings: Booking[], total: number }> {
    const offset = (page - 1) * limit;

    const [bookingsResult, countResult] = await Promise.all([
      query(
        `SELECT 
          b.id, b.user_id, b.schedule_id, b.booking_reference, b.passenger_count,
          b.passenger_details, b.departure_station, b.arrival_station,
          b.journey_date, b.departure_time, b.seat_numbers, b.total_amount,
          b.payment_status, b.payment_method, b.payment_reference,
          b.booking_status, b.qr_code, b.cancellation_reason, b.refund_amount,
          b.booked_at, b.cancelled_at, b.created_at, b.updated_at,
          t.name as train_name, t.number as train_number,
          ds.name as departure_station_name, ds.code as departure_station_code,
          as_.name as arrival_station_name, as_.code as arrival_station_code
         FROM bookings b
         JOIN schedules s ON b.schedule_id = s.id
         JOIN trains t ON s.train_id = t.id
         JOIN stations ds ON b.departure_station = ds.id
         JOIN stations as_ ON b.arrival_station = as_.id
         WHERE b.user_id = $1
         ORDER BY b.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      ),
      query('SELECT COUNT(*) FROM bookings WHERE user_id = $1', [userId])
    ]);

    const bookings = bookingsResult.rows.map(booking => ({
      ...booking,
      passenger_details: JSON.parse(booking.passenger_details),
      seat_numbers: booking.seat_numbers || []
    }));

    return {
      bookings,
      total: parseInt(countResult.rows[0].count)
    };
  }

  static async updatePaymentStatus(
    bookingId: string,
    paymentStatus: Booking['payment_status'],
    paymentReference?: string
  ): Promise<boolean> {
    const updateFields = ['payment_status = $2', 'updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [bookingId, paymentStatus];

    if (paymentReference) {
      updateFields.push('payment_reference = $3');
      params.push(paymentReference);
    }

    // If payment is successful, generate QR code
    if (paymentStatus === 'paid') {
      const qrCode = this.generateQRCode(bookingId);
      updateFields.push(`qr_code = $${params.length + 1}`);
      params.push(qrCode);
    }

    const result = await query(
      `UPDATE bookings SET ${updateFields.join(', ')} WHERE id = $1`,
      params
    );

    return result.rowCount > 0;
  }

  static async cancelBooking(bookingId: string, userId: string, reason?: string): Promise<boolean> {
    const client = await query('BEGIN', []);
    
    try {
      // Get booking details
      const booking = await this.findById(bookingId, userId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.booking_status === 'cancelled') {
        throw new Error('Booking already cancelled');
      }

      // Update booking status
      const result = await query(
        `UPDATE bookings 
         SET booking_status = 'cancelled', 
             cancellation_reason = $2,
             cancelled_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $3`,
        [bookingId, reason, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('Failed to cancel booking');
      }

      // Release seats back to schedule
      await ScheduleModel.updateAvailableSeats(
        booking.schedule_id,
        booking.passenger_count
      );

      // Calculate refund amount (simplified logic)
      const journeyDate = new Date(booking.journey_date);
      const now = new Date();
      const hoursDifference = (journeyDate.getTime() - now.getTime()) / (1000 * 3600);
      
      let refundAmount = 0;
      if (hoursDifference > 24) {
        refundAmount = booking.total_amount * 0.9; // 90% refund
      } else if (hoursDifference > 2) {
        refundAmount = booking.total_amount * 0.5; // 50% refund
      }

      if (refundAmount > 0) {
        await query(
          'UPDATE bookings SET refund_amount = $1 WHERE id = $2',
          [refundAmount, bookingId]
        );
      }

      await query('COMMIT', []);
      return true;
    } catch (error) {
      await query('ROLLBACK', []);
      throw error;
    }
  }

  static async updateBookingStatus(bookingId: string, status: Booking['booking_status']): Promise<boolean> {
    const result = await query(
      'UPDATE bookings SET booking_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, bookingId]
    );

    return result.rowCount > 0;
  }

  private static generateBookingReference(): string {
    const prefix = 'KMRL';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  private static generateQRCode(bookingId: string): string {
    // In a real application, you'd use a QR code library
    // For now, we'll return a base64-encoded JSON string
    const qrData = {
      booking_id: bookingId,
      timestamp: Date.now(),
      type: 'KMRL_BOOKING'
    };
    
    return Buffer.from(JSON.stringify(qrData)).toString('base64');
  }

  static async getBookingStats(userId?: string): Promise<{
    total: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    totalAmount: number;
  }> {
    let userFilter = '';
    const queryParams: any[] = [];

    if (userId) {
      userFilter = 'WHERE user_id = $1';
      queryParams.push(userId);
    }

    const result = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN booking_status = 'confirmed' THEN 1 END) as confirmed,
        COUNT(CASE WHEN booking_status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN booking_status = 'cancelled' THEN 1 END) as cancelled,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as total_amount
       FROM bookings ${userFilter}`,
      queryParams
    );

    return {
      total: parseInt(result.rows[0].total),
      confirmed: parseInt(result.rows[0].confirmed),
      completed: parseInt(result.rows[0].completed),
      cancelled: parseInt(result.rows[0].cancelled),
      totalAmount: parseFloat(result.rows[0].total_amount)
    };
  }
}