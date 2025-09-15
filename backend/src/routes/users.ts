import { Router } from 'express';

const router = Router();

router.get('/profile', (req, res) => {
  res.json({ message: 'Get user profile - TODO: Implement' });
});

router.put('/profile', (req, res) => {
  res.json({ message: 'Update user profile - TODO: Implement' });
});

export default router;