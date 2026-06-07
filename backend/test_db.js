require('dotenv').config();
const mysql = require('mysql2/promise');

async function test() {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'Sonu2007$sn',
        database: process.env.DB_DATABASE || 'accident_response_db'
    };

    console.log('Connecting with config:', {
        host: config.host,
        user: config.user,
        password: config.password ? '***SET***' : '***NOT SET***',
        database: config.database
    });

    try {
        const conn = await mysql.createConnection(config);
        console.log('\n✅ SUCCESS: Connected to MySQL!\n');

        const [tables] = await conn.query('SHOW TABLES');
        console.log('Tables in database:');
        tables.forEach(r => console.log('  -', Object.values(r)[0]));

        const [r1] = await conn.query('SELECT COUNT(*) as cnt FROM accidents');
        console.log('\naccidents table rows:', r1[0].cnt);

        const [r2] = await conn.query('SELECT COUNT(*) as cnt FROM accident');
        console.log('accident table rows:', r2[0].cnt);

        const [r3] = await conn.query('SELECT COUNT(*) as cnt FROM alert');
        console.log('alert table rows:', r3[0].cnt);

        const [r4] = await conn.query('SELECT COUNT(*) as cnt FROM road');
        console.log('road table rows:', r4[0].cnt);

        // Try a test insert into accidents table
        const [ins] = await conn.execute(
            'INSERT INTO accidents (severity_score, severity_level, vehicle_count, image_path) VALUES (?, ?, ?, ?)',
            [0.5, 'MEDIUM', 3, '/uploads/test_connection.jpg']
        );
        console.log('\n✅ TEST INSERT into accidents SUCCEEDED — insertId:', ins.insertId);

        // Clean up test row
        await conn.execute('DELETE FROM accidents WHERE id = ?', [ins.insertId]);
        console.log('✅ Cleaned up test row\n');

        await conn.end();
        console.log('DB connection test PASSED ✅');
    } catch (e) {
        console.error('\n❌ FAILED:', e.message);
        console.error('Error code:', e.code);
        console.error('SQL State:', e.sqlState);
    }
}

test();
