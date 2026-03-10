import { pool } from '../db.js';
import { authMiddleware } from '../auth.js';
export async function studentsRoutes(app) {
    // POST /api/students — cria student (fallback do trigger)
    app.post('/api/students', { preHandler: authMiddleware }, async (request, reply) => {
        const { userId } = request;
        const { name, email, role } = request.body;
        if (!name || !email) {
            return reply.status(400).send({ error: 'name e email são obrigatórios' });
        }
        try {
            await pool.query(`INSERT INTO students (id, email, name, role)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO NOTHING`, [userId, email, name, role ?? 'student']);
            // Garante gamification row também
            await pool.query(`INSERT INTO gamification (student_id)
           VALUES ($1)
           ON CONFLICT (student_id) DO NOTHING`, [userId]);
            return reply.status(201).send({ ok: true });
        }
        catch (err) {
            console.error('[students/create]', err);
            return reply.status(500).send({ error: 'Erro ao criar aluna' });
        }
    });
}
//# sourceMappingURL=students.js.map