import { Router } from 'express';
const router = Router();
router.get('/', (req, res) => res.json({ message: 'Get notifications - TODO: Implement' }));
export default router;