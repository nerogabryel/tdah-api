import { pool } from '../db.js';
import { authMiddleware } from '../auth.js';
export async function lessonsRoutes(app) {
    // POST /api/lessons/complete — transação atômica
    app.post('/api/lessons/complete', { preHandler: authMiddleware }, async (request, reply) => {
        const { userId } = request;
        const { lessonId, status, response, xpDelta, dailyActivity, currentStreak, newAchievements } = request.body;
        if (!lessonId || !status) {
            return reply.status(400).send({ error: 'lessonId e status são obrigatórios' });
        }
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            // 1. Upsert lesson_progress
            await client.query(`INSERT INTO lesson_progress (student_id, lesson_id, status, response, saved_at, completed_at)
           VALUES ($1, $2, $3, $4, now(), CASE WHEN $3 = 'completed' THEN now() ELSE NULL END)
           ON CONFLICT (student_id, lesson_id)
           DO UPDATE SET
             status = EXCLUDED.status,
             response = EXCLUDED.response,
             saved_at = EXCLUDED.saved_at,
             completed_at = COALESCE(EXCLUDED.completed_at, lesson_progress.completed_at)`, [userId, lessonId, status, JSON.stringify(response)]);
            // 2. Upsert gamification (xp incrementa, level pega o maior)
            await client.query(`INSERT INTO gamification (student_id, xp, level, daily_activity, last_active_date, current_streak)
           VALUES ($1, $2, 1, $3, CURRENT_DATE, $4)
           ON CONFLICT (student_id)
           DO UPDATE SET
             xp = gamification.xp + $2,
             daily_activity = $3,
             last_active_date = CURRENT_DATE,
             current_streak = $4`, [userId, xpDelta, JSON.stringify(dailyActivity), currentStreak]);
            // 3. Insert achievements
            if (newAchievements && newAchievements.length > 0) {
                for (const ach of newAchievements) {
                    await client.query(`INSERT INTO unlocked_achievements (student_id, achievement_id, unlocked_at)
               VALUES ($1, $2, $3)
               ON CONFLICT (student_id, achievement_id) DO NOTHING`, [userId, ach.id, ach.unlocked_at]);
                }
            }
            await client.query('COMMIT');
            return reply.status(200).send({ ok: true });
        }
        catch (err) {
            await client.query('ROLLBACK');
            console.error('[lessons/complete]', err);
            return reply.status(500).send({ error: 'Erro ao completar atividade' });
        }
        finally {
            client.release();
        }
    });
    // PUT /api/lessons/draft — salva rascunho
    app.put('/api/lessons/draft', { preHandler: authMiddleware }, async (request, reply) => {
        const { userId } = request;
        const { lessonId, response } = request.body;
        if (!lessonId) {
            return reply.status(400).send({ error: 'lessonId é obrigatório' });
        }
        try {
            await pool.query(`INSERT INTO lesson_progress (student_id, lesson_id, status, response, saved_at)
           VALUES ($1, $2, 'in_progress', $3, now())
           ON CONFLICT (student_id, lesson_id)
           DO UPDATE SET
             response = EXCLUDED.response,
             saved_at = EXCLUDED.saved_at`, [userId, lessonId, JSON.stringify(response)]);
            return reply.status(200).send({ ok: true });
        }
        catch (err) {
            console.error('[lessons/draft]', err);
            return reply.status(500).send({ error: 'Erro ao salvar rascunho' });
        }
    });
}
//# sourceMappingURL=lessons.js.map