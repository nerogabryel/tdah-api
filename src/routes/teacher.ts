import type { FastifyInstance } from 'fastify'
import { pool } from '../db.js'
import { authMiddleware } from '../auth.js'

async function requireTeacher(userId: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT role FROM students WHERE id = $1`,
    [userId],
  )
  const role = rows[0]?.role
  return role === 'teacher' || role === 'admin'
}

export async function teacherRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/teacher/students — lista todas alunas com stats
  app.get(
    '/api/teacher/students',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { userId } = request

      if (!(await requireTeacher(userId))) {
        return reply.status(403).send({ error: 'Acesso restrito a professoras' })
      }

      try {
        const [studentsResult, gamResult, progressResult] = await Promise.all([
          pool.query(
            `SELECT id, email, name, role, created_at
             FROM students
             ORDER BY created_at DESC`,
          ),
          pool.query(
            `SELECT student_id, xp, level, current_streak, last_active_date
             FROM gamification`,
          ),
          pool.query(
            `SELECT student_id, COUNT(*) as completed_count
             FROM lesson_progress
             WHERE status = 'completed'
             GROUP BY student_id`,
          ),
        ])

        const gamMap = new Map(
          gamResult.rows.map((g) => [g.student_id as string, g]),
        )
        const progressMap = new Map(
          progressResult.rows.map((p) => [
            p.student_id as string,
            parseInt(p.completed_count as string, 10),
          ]),
        )

        const students = studentsResult.rows.map((s) => {
          const g = gamMap.get(s.id as string)
          return {
            id: s.id,
            email: s.email,
            name: s.name,
            role: s.role ?? 'student',
            created_at: s.created_at,
            completedLessons: progressMap.get(s.id as string) ?? 0,
            xp: (g?.xp as number) ?? 0,
            level: (g?.level as number) ?? 1,
            currentStreak: (g?.current_streak as number) ?? 0,
            lastActiveDate: (g?.last_active_date as string | null) ?? null,
          }
        })

        return reply.status(200).send({ students })
      } catch (err) {
        console.error('[teacher/students]', err)
        return reply.status(500).send({ error: 'Erro ao listar alunas' })
      }
    },
  )

  // GET /api/teacher/students/:id/gamification
  app.get<{ Params: { id: string } }>(
    '/api/teacher/students/:id/gamification',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { userId } = request
      const { id: studentId } = request.params

      if (!(await requireTeacher(userId))) {
        return reply.status(403).send({ error: 'Acesso restrito a professoras' })
      }

      try {
        const [gamResult, achResult] = await Promise.all([
          pool.query(
            `SELECT xp, level, daily_activity, last_active_date, current_streak
             FROM gamification
             WHERE student_id = $1`,
            [studentId],
          ),
          pool.query(
            `SELECT achievement_id, unlocked_at
             FROM unlocked_achievements
             WHERE student_id = $1`,
            [studentId],
          ),
        ])

        if (gamResult.rows.length === 0) {
          return reply.status(404).send({ error: 'Dados não encontrados' })
        }

        const g = gamResult.rows[0]
        return reply.status(200).send({
          xp: g.xp,
          level: g.level,
          dailyActivity: g.daily_activity,
          lastActiveDate: g.last_active_date,
          currentStreak: g.current_streak,
          unlockedAchievements: achResult.rows.map((a) => ({
            achievementId: a.achievement_id,
            unlockedAt: a.unlocked_at,
          })),
        })
      } catch (err) {
        console.error('[teacher/gamification]', err)
        return reply.status(500).send({ error: 'Erro ao carregar gamification' })
      }
    },
  )
}
