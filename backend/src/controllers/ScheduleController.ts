import { Request, Response } from 'express';
import { ScheduleModel } from '../models/Schedule';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth';

export class ScheduleController {
  // Search schedules
  searchSchedules = async (req: Request, res: Response) => {
    try {
      const { from_station, to_station, date, time } = req.query;

      if (!from_station || !to_station || !date) {
        return res.status(400).json({
          success: false,
          message: 'From station, to station, and date are required'
        });
      }

      const searchParams = {
        from_station: from_station as string,
        to_station: to_station as string,
        date: date as string,
        time: time as string | undefined
      };

      const schedules = await ScheduleModel.search(searchParams);

      res.json({
        success: true,
        data: {
          schedules,
          count: schedules.length,
          search_params: searchParams
        }
      });
    } catch (error) {
      logger.error('Search schedules error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search schedules'
      });
    }
  };

  // Get schedule by ID
  getSchedule = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const schedule = await ScheduleModel.findById(id);
      
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Schedule not found'
        });
      }

      res.json({
        success: true,
        data: { schedule }
      });
    } catch (error) {
      logger.error('Get schedule error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve schedule'
      });
    }
  };

  // Get today's schedules
  getTodaySchedules = async (req: Request, res: Response) => {
    try {
      const { station_id } = req.query;
      
      const schedules = await ScheduleModel.getTodaySchedules(
        station_id as string | undefined
      );

      res.json({
        success: true,
        data: {
          schedules,
          count: schedules.length,
          date: new Date().toISOString().split('T')[0]
        }
      });
    } catch (error) {
      logger.error('Get today schedules error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve today\'s schedules'
      });
    }
  };

  // Get upcoming departures from a station
  getUpcomingDepartures = async (req: Request, res: Response) => {
    try {
      const { station_id } = req.params;
      const { limit = '10' } = req.query;
      
      const schedules = await ScheduleModel.getUpcomingDepartures(
        station_id, 
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: {
          schedules,
          count: schedules.length,
          station_id
        }
      });
    } catch (error) {
      logger.error('Get upcoming departures error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve upcoming departures'
      });
    }
  };

  // Get schedules by route
  getSchedulesByRoute = async (req: Request, res: Response) => {
    try {
      const { route_id } = req.params;
      
      const schedules = await ScheduleModel.getSchedulesByRoute(route_id);

      res.json({
        success: true,
        data: {
          schedules,
          count: schedules.length,
          route_id
        }
      });
    } catch (error) {
      logger.error('Get schedules by route error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve schedules for route'
      });
    }
  };

  // Update schedule status (admin/operator only)
  updateScheduleStatus = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status, delay_minutes } = req.body;

      if (!status || !['active', 'cancelled', 'delayed', 'maintenance'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Valid status is required (active, cancelled, delayed, maintenance)'
        });
      }

      const updated = await ScheduleModel.updateStatus(id, status, delay_minutes);

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Schedule not found'
        });
      }

      logger.info(`Schedule ${id} status updated to ${status} by user ${req.user?.email}`);

      res.json({
        success: true,
        message: 'Schedule status updated successfully',
        data: {
          schedule_id: id,
          status,
          delay_minutes: delay_minutes || 0
        }
      });
    } catch (error) {
      logger.error('Update schedule status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update schedule status'
      });
    }
  };
}