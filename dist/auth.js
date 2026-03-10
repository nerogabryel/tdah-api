import { jwtVerify } from 'jose';
import { config } from './config.js';
const secret = new TextEncoder().encode(config.SUPABASE_JWT_SECRET);
export async function authMiddleware(request, reply) {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Token não fornecido' });
    }
    const token = authHeader.slice(7);
    try {
        const { payload } = await jwtVerify(token, secret, {
            algorithms: ['HS256'],
        });
        const sub = payload.sub;
        if (!sub) {
            return reply.status(401).send({ error: 'Token inválido: sem sub' });
        }
        request.userId = sub;
    }
    catch {
        return reply.status(401).send({ error: 'Token inválido ou expirado' });
    }
}
//# sourceMappingURL=auth.js.map