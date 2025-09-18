import { query, cacheGet, cacheSet } from '../config/database';

export interface Schedule {
  id: string;
  train_id: string;
  route_id: string;
  departure_station: string;
  arrival_station: string;
  departure_time: string;
  arrival_time: string;
  frequency: number;
  days_of_week: number[];
  valid_from: Date;
  valid_until?: Date;
  status: 'active' | 'cancelled' | 'delayed' | 'maintenance';
  delay_minutes: number;
  available_seats: number;
  price: number;
  created_at: Date;
  updated_at: Date;
  
  // Joined fields
  train_name?: string;
  train_number?: string;
  departure_station_name?: string;
  arrival_station_name?: string;
  departure_station_code?: string;
  arrival_station_code?: string;
}

export interface ScheduleSearch {
  from_station: string;
  to_station: string;
  date: string;
  time?: string;
}

export class ScheduleModel {
  private static CACHE_PREFIX = 'schedules';
  private static CACHE_TTL = 1800; // 30 minutes

  static async create(scheduleData: {
    train_id: string;
    route_id: string;
    departure_station: string;
    arrival_station: string;
    departure_time: string;
    arrival_time: string;
    frequency?: number;
    days_of_week?: number[];
    valid_from: Date;
    valid_until?: Date;
    available_seats?: number;
    price: number;
  }): Promise<Schedule> {
    const result = await query(
      `INSERT INTO schedules (
        train_id, route_id, departure_station, arrival_station,
        departure_time, arrival_time, frequency, days_of_week,
        valid_from, valid_until, available_seats, price
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
      RETURNING *`,
      [
        scheduleData.train_id,
        scheduleData.route_id,
        scheduleData.departure_station,
        scheduleData.arrival_station,
        scheduleData.departure_time,
        scheduleData.arrival_time,
        scheduleData.frequency || 300,
        scheduleData.days_of_week || [1,2,3,4,5,6,7],
        scheduleData.valid_from,
        scheduleData.valid_until,
        scheduleData.available_seats || 300,
        scheduleData.price
      ]
    );

    return result.rows[0];
  }

  static async search(searchParams: ScheduleSearch): Promise<Schedule[]> {
    const { from_station, to_station, date, time } = searchParams;
    const cacheKey = `${this.CACHE_PREFIX}:search:${from_station}:${to_station}:${date}:${time || 'all'}`;
    
    let schedules = await cacheGet(cacheKey);

    if (!schedules) {
      // Get day of week (1 = Monday, 7 = Sunday)
      const searchDate = new Date(date);
      const dayOfWeek = searchDate.getDay() === 0 ? 7 : searchDate.getDay();

      let timeFilter = '';
      let queryParams: any[] = [from_station, to_station, searchDate, dayOfWeek];

      if (time) {
        timeFilter = 'AND s.departure_time >= $5';
        queryParams.push(time);
      }

      const result = await query(
        `SELECT 
          s.id, s.train_id, s.route_id, s.departure_station, s.arrival_station,
          s.departure_time, s.arrival_time, s.frequency, s.days_of_week,
          s.valid_from, s.valid_until, s.status, s.delay_minutes,
          s.available_seats, s.price, s.created_at, s.updated_at,
          t.name as train_name, t.number as train_number,
          ds.name as departure_station_name, ds.code as departure_station_code,
          as_.name as arrival_station_name, as_.code as arrival_station_code
         FROM schedules s
         JOIN trains t ON s.train_id = t.id
         JOIN stations ds ON s.departure_station = ds.id
         JOIN stations as_ ON s.arrival_station = as_.id
         WHERE s.departure_station = $1 
           AND s.arrival_station = $2
           AND s.valid_from <= $3
           AND (s.valid_until IS NULL OR s.valid_until >= $3)
           AND $4 = ANY(s.days_of_week)
           AND s.status = 'active'
           AND t.is_active = true
           AND ds.is_active = true
           AND as_.is_active = true
           ${timeFilter}
         ORDER BY s.departure_time`,
        queryParams
      );

      schedules = result.rows;
      await cacheSet(cacheKey, schedules, this.CACHE_TTL);
    }

    return schedules;
  }

  static async findById(id: string): Promise<Schedule | null> {
    const result = await query(
      `SELECT 
        s.id, s.train_id, s.route_id, s.departure_station, s.arrival_station,
        s.departure_time, s.arrival_time, s.frequency, s.days_of_week,
        s.valid_from, s.valid_until, s.status, s.delay_minutes,
        s.available_seats, s.price, s.created_at, s.updated_at,
        t.name as train_name, t.number as train_number,
        ds.name as departure_station_name, ds.code as departure_station_code,
        as_.name as arrival_station_name, as_.code as arrival_station_code
       FROM schedules s
       JOIN trains t ON s.train_id = t.id
       JOIN stations ds ON s.departure_station = ds.id
       JOIN stations as_ ON s.arrival_station = as_.id
       WHERE s.id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  static async updateAvailableSeats(scheduleId: string, seatChange: number): Promise<boolean> {
    const result = await query(
      `UPDATE schedules 
       SET available_seats = available_seats + $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND available_seats + $1 >= 0
       RETURNING id`,
      [seatChange, scheduleId]
    );

    return result.rowCount > 0;
  }

  static async updateStatus(scheduleId: string, status: Schedule['status'], delayMinutes?: number): Promise<boolean> {
    const updateFields = ['status = $2', 'updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [scheduleId, status];

    if (delayMinutes !== undefined) {
      updateFields.push('delay_minutes = $3');
      params.push(delayMinutes);
    }

    const result = await query(
      `UPDATE schedules SET ${updateFields.join(', ')} WHERE id = $1`,
      params
    );

    return result.rowCount > 0;
  }

  static async getTodaySchedules(stationId?: string): Promise<Schedule[]> {
    const today = new Date();
    const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
    
    let stationFilter = '';
    let queryParams: any[] = [today, dayOfWeek];

    if (stationId) {
      stationFilter = 'AND (s.departure_station = $3 OR s.arrival_station = $3)';
      queryParams.push(stationId);
    }

    const result = await query(
      `SELECT 
        s.id, s.train_id, s.route_id, s.departure_station, s.arrival_station,
        s.departure_time, s.arrival_time, s.frequency, s.days_of_week,
        s.valid_from, s.valid_until, s.status, s.delay_minutes,
        s.available_seats, s.price, s.created_at, s.updated_at,
        t.name as train_name, t.number as train_number,
        ds.name as departure_station_name, ds.code as departure_station_code,
        as_.name as arrival_station_name, as_.code as arrival_station_code
       FROM schedules s
       JOIN trains t ON s.train_id = t.id
       JOIN stations ds ON s.departure_station = ds.id
       JOIN stations as_ ON s.arrival_station = as_.id
       WHERE s.valid_from <= $1
         AND (s.valid_until IS NULL OR s.valid_until >= $1)
         AND $2 = ANY(s.days_of_week)
         AND t.is_active = true
         AND ds.is_active = true
         AND as_.is_active = true
         ${stationFilter}
       ORDER BY s.departure_time`,
      queryParams
    );

    return result.rows;
  }

  static async getSchedulesByRoute(routeId: string): Promise<Schedule[]> {
    const result = await query(
      `SELECT 
        s.id, s.train_id, s.route_id, s.departure_station, s.arrival_station,
        s.departure_time, s.arrival_time, s.frequency, s.days_of_week,
        s.valid_from, s.valid_until, s.status, s.delay_minutes,
        s.available_seats, s.price, s.created_at, s.updated_at,
        t.name as train_name, t.number as train_number,
        ds.name as departure_station_name, ds.code as departure_station_code,
        as_.name as arrival_station_name, as_.code as arrival_station_code
       FROM schedules s
       JOIN trains t ON s.train_id = t.id
       JOIN stations ds ON s.departure_station = ds.id
       JOIN stations as_ ON s.arrival_station = as_.id
       WHERE s.route_id = $1
         AND s.status = 'active'
         AND t.is_active = true
       ORDER BY s.departure_time`,
      [routeId]
    );

    return result.rows;
  }

  static async getUpcomingDepartures(stationId: string, limit: number = 10): Promise<Schedule[]> {
    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0];
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();

    const result = await query(
      `SELECT 
        s.id, s.train_id, s.route_id, s.departure_station, s.arrival_station,
        s.departure_time, s.arrival_time, s.frequency, s.days_of_week,
        s.valid_from, s.valid_until, s.status, s.delay_minutes,
        s.available_seats, s.price, s.created_at, s.updated_at,
        t.name as train_name, t.number as train_number,
        ds.name as departure_station_name, ds.code as departure_station_code,
        as_.name as arrival_station_name, as_.code as arrival_station_code
       FROM schedules s
       JOIN trains t ON s.train_id = t.id
       JOIN stations ds ON s.departure_station = ds.id
       JOIN stations as_ ON s.arrival_station = as_.id
       WHERE s.departure_station = $1
         AND s.departure_time > $2
         AND s.valid_from <= $3
         AND (s.valid_until IS NULL OR s.valid_until >= $3)
         AND $4 = ANY(s.days_of_week)
         AND s.status = 'active'
         AND t.is_active = true
         AND ds.is_active = true
         AND as_.is_active = true
       ORDER BY s.departure_time
       LIMIT $5`,
      [stationId, currentTime, now, dayOfWeek, limit]
    );

    return result.rows;
  }

  static async delete(id: string): Promise<boolean> {
    const result = await query(
      'UPDATE schedules SET status = $1 WHERE id = $2',
      ['cancelled', id]
    );

    return result.rowCount > 0;
  }
}