import { Router } from 'express';

const router = Router();

// GET /api/v1/stations
router.get('/', (req, res) => {
  res.json({ message: 'Get all stations - TODO: Implement' });
});

// GET /api/v1/stations/:id
router.get('/:id', (req, res) => {
  res.json({ message: `Get station ${req.params.id} - TODO: Implement` });
});

// POST /api/v1/stations (Admin only)
router.post('/', (req, res) => {
  res.json({ message: 'Create station - TODO: Implement' });
});

// PUT /api/v1/stations/:id (Admin only)
router.put('/:id', (req, res) => {
  res.json({ message: `Update station ${req.params.id} - TODO: Implement` });
});

// DELETE /api/v1/stations/:id (Admin only)
router.delete('/:id', (req, res) => {
  res.json({ message: `Delete station ${req.params.id} - TODO: Implement` });
});

export default router;