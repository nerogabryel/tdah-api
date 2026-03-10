import { pool } from '../db.js';
import { authMiddleware } from '../auth.js';
export async function syncRoutes(app) {
    // GET /api/sync/all — carrega progress + gamification + achievements
    app.get('/api/sync/all', { preHandler: authMiddleware }, async (request, reply) => {
        const { userId } = request;
        try {
            // 3 queries em paralelo
            const [progressResult, gamResult, achResult] = await Promise.all([
                pool.query(`SELECT lesson_id, status, response, saved_at, completed_at
             FROM lesson_progress
             WHERE student_id = $1`, [userId]),
                pool.query(`SELECT xp, level, daily_activity, last_active_date, current_streak
             FROM gamification
             WHERE student_id = $1`, [userId]),
                pool.query(`SELECT achievement_id, unlocked_at
             FROM unlocked_achievements
             WHERE student_id = $1`, [userId]),
            ]);
            return reply.status(200).send({
                progress: progressResult.rows.map((row) => ({
                    lessonId: row.lesson_id,
                    status: row.status,
                    response: row.response,
                    savedAt: row.saved_at,
                    completedAt: row.completed_at,
                })),
                gamification: gamResult.rows[0]
                    ? {
                        xp: gamResult.rows[0].xp,
                        level: gamResult.rows[0].level,
                        dailyActivity: gamResult.rows[0].daily_activity,
                        lastActiveDate: gamResult.rows[0].last_active_date,
                        currentStreak: gamResult.rows[0].current_streak,
                    }
                    : null,
                achievements: achResult.rows.map((row) => ({
                    achievementId: row.achievement_id,
                    unlockedAt: row.unlocked_at,
                })),
            });
        }
        catch (err) {
            console.error('[sync/all]', err);
            return reply.status(500).send({ error: 'Erro ao carregar dados' });
        }
    });
}
//# sourceMappingURL=sync.js.map