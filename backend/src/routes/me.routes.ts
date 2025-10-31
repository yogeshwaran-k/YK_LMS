import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getAssignedCourseIds } from '../utils/access';
import { supabaseAdmin } from '../supabase';

const router = Router();
router.use(authenticate);

// Student: list only assigned courses (direct + via groups)
router.get('/courses', async (req, res) => {
  const role = req.user?.role;
  if (role !== 'student') return res.status(400).json({ error: 'Students only' });
  const ids = await getAssignedCourseIds(req.user!.sub);
  if (!ids.length) return res.json([]);
  const { data, error } = await supabaseAdmin
    .from('courses')
    .select('*')
.in('id', ids)
    .eq('is_published', true)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;