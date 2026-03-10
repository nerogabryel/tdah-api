import pg from 'pg';
import { config } from './config.js';
const { Pool } = pg;
export const pool = new Pool({
    connectionString: config.DATABASE_URL,
    max: 25,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
});
// Log de conexão no boot
pool.on('error', (err) => {
    console.error('[db] Erro inesperado no pool:', err.message);
});
export async function checkConnection() {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        return true;
    }
    catch (err) {
        console.error('[db] Falha na conexão:', err);
        return false;
    }
}
//# sourceMappingURL=db.js.map