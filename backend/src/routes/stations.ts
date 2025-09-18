import { Router } from 'express';
import { StationController } from '../controllers/StationController';

const router = Router();
const stationController = new StationController();

// Public routes
router.get('/', stationController.getStations);
router.get('/search', stationController.searchStations);
router.get('/route', stationController.getRoute);
router.get('/:id', stationController.getStation);

export default router;
