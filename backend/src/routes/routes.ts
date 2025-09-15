import { Router } from 'express';
const router = Router();
router.get('/', (req, res) => res.json({ message: 'Get routes - TODO: Implement' }));
export default router;