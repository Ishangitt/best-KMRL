import { Request, Response } from 'express';
import { StationModel } from '../models/Station';
import { logger } from '../utils/logger';

export class StationController {
  // Get all stations
  getStations = async (req: Request, res: Response) => {
    try {
      const { active_only = 'true' } = req.query;
      const activeOnly = active_only === 'true';
      
      const stations = await StationModel.findAll(activeOnly);

      res.json({
        success: true,
        data: {
          stations,
          count: stations.length
        }
      });
    } catch (error) {
      logger.error('Get stations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve stations'
      });
    }
  };

  // Get station by ID
  getStation = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const station = await StationModel.findById(id);
      
      if (!station) {
        return res.status(404).json({
          success: false,
          message: 'Station not found'
        });
      }

      res.json({
        success: true,
        data: { station }
      });
    } catch (error) {
      logger.error('Get station error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve station'
      });
    }
  };

  // Search stations
  searchStations = async (req: Request, res: Response) => {
    try {
      const { q: searchTerm } = req.query;
      
      if (!searchTerm || typeof searchTerm !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Search term is required'
        });
      }

      const stations = await StationModel.search(searchTerm);

      res.json({
        success: true,
        data: {
          stations,
          count: stations.length
        }
      });
    } catch (error) {
      logger.error('Search stations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search stations'
      });
    }
  };

  // Get route between stations
  getRoute = async (req: Request, res: Response) => {
    try {
      const { from, to } = req.query;
      
      if (!from || !to) {
        return res.status(400).json({
          success: false,
          message: 'From and to station IDs are required'
        });
      }

      const route = await StationModel.getRoute(from as string, to as string);

      res.json({
        success: true,
        data: {
          route,
          stations: route,
          count: route.length
        }
      });
    } catch (error) {
      logger.error('Get route error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get route'
      });
    }
  };
}