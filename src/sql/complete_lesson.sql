-- Transação atômica: upsert progress + gamification + achievements
-- Replicação do RPC complete_lesson_atomic para execução direta via pg

-- 1. Upsert lesson_progress
INSERT INTO lesson_progress (student_id, lesson_id, status, response, saved_at, completed_at)
VALUES ($1, $2, $3, $4, now(), CASE WHEN $3 = 'completed' THEN now() ELSE NULL END)
ON CONFLICT (student_id, lesson_id)
DO UPDATE SET
  status = EXCLUDED.status,
  response = EXCLUDED.response,
  saved_at = EXCLUDED.saved_at,
  completed_at = COALESCE(EXCLUDED.completed_at, lesson_progress.completed_at);

-- 2. Upsert gamification
INSERT INTO gamification (student_id, xp, level, daily_activity, last_active_date, current_streak)
VALUES ($1, $5, $6, $7, CURRENT_DATE, $8)
ON CONFLICT (student_id)
DO UPDATE SET
  xp = gamification.xp + $9,
  level = GREATEST(gamification.level, $6),
  daily_activity = $7,
  last_active_date = CURRENT_DATE,
  current_streak = $8;

-- 3. Insert achievements (executado em loop no código)
INSERT INTO unlocked_achievements (student_id, achievement_id, unlocked_at)
VALUES ($1, $10, $11)
ON CONFLICT (student_id, achievement_id) DO NOTHING;
