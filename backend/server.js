const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
require('dotenv').config(); // Load .env FIRST before anything else

// ──────────────────────────────────────────────────────
// DB connection at TOP LEVEL — not lazily inside routes
// ──────────────────────────────────────────────────────
const db = require('./db');

// Test DB on startup
db.query('SELECT 1')
    .then(() => {
        console.log('✅ MySQL Connected Successfully to', process.env.DB_DATABASE || 'accident_response_db');
    })
    .catch(err => {
        console.error('❌ MySQL Connection FAILED:', err.message);
        fs.appendFileSync('db_error.log', `[${new Date().toISOString()}] STARTUP DB ERROR: ${err.stack}\n`);
    });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ROOT ROUTE
app.get('/', (req, res) => {
    res.status(200).send('<h1>Traffic Accident Analysis System - BACKEND IS ACTIVE</h1><p>API is working. Use /upload for analysis.</p>');
});

app.get('/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ status: 'active', db: 'connected', time: new Date() });
    } catch (e) {
        res.json({ status: 'active', db: 'DISCONNECTED', error: e.message, time: new Date() });
    }
});

// Ensure uploads directory exists
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads', { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'uploads/'); },
    filename: (req, file, cb) => { cb(null, Date.now() + path.extname(file.originalname)); }
});
const upload = multer({ storage });

const getSeverityLevel = (score) => {
    if (score > 0.7) return 'High';
    if (score > 0.4) return 'Medium';
    return 'Low';
};

// ──────────────────────────────────────────────────────
// Route: Upload and Analyze
// ──────────────────────────────────────────────────────
app.post('/upload', upload.single('media'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`[UPLOAD] File received: ${req.file.filename}`);

    const filePath = path.resolve(req.file.path).replace(/\\/g, '/');
    const pythonScript = path.resolve('../ml/analyze.py').replace(/\\/g, '/');

    console.log(`[ML] Running: python "${pythonScript}" "${filePath}"`);

    exec(`python "${pythonScript}" "${filePath}"`, { maxBuffer: 1024 * 1024 * 10 }, async (error, stdout, stderr) => {
        if (error) {
            console.error(`[ML ERROR] ${error.message}`);
            console.error(`[ML STDERR] ${stderr}`);
            fs.appendFileSync('server_error.log', `[${new Date().toISOString()}] ML EXEC ERROR:\n${error.stack}\nSTDERR: ${stderr}\n`);
            return res.status(500).json({ error: 'ML script failed', details: stderr });
        }

        console.log(`[ML STDOUT] ${stdout.trim()}`);

        try {
            const jsonStart = stdout.lastIndexOf('{');
            const jsonEnd = stdout.lastIndexOf('}');

            if (jsonStart === -1 || jsonEnd === -1) {
                console.error('[ML ERROR] No JSON in output:', stdout);
                return res.status(500).json({ error: 'Invalid ML output format', raw: stdout });
            }

            const jsonStr = stdout.substring(jsonStart, jsonEnd + 1);
            const result = JSON.parse(jsonStr);

            if (result.error) {
                console.error('[ML ERROR] Script returned error:', result.error);
                fs.appendFileSync('server_error.log', `[${new Date().toISOString()}] ML ERROR: ${result.error}\n`);
                return res.status(500).json({ error: result.error });
            }

            const severityLevel = getSeverityLevel(result.severity_score);
            const imagePath = `/uploads/${req.file.filename}`;
            let annotatedImagePath = imagePath;
            if (result.annotated_filename) {
                annotatedImagePath = `/uploads/${result.annotated_filename}`;
            }

            console.log(`[RESULT] severity=${severityLevel} score=${result.severity_score} accident=${result.accident_detected}`);

            // ──────────────────────────────────────────
            // DB WRITE — both tables
            // ──────────────────────────────────────────
            let insertedId = null;
            let insertedAccidentId = null;

            const lat = req.body.latitude || null;
            const lng = req.body.longitude || null;
            const cam_id = req.body.camera_id || `CAM_AUTO_${Date.now()}`;

            try {
                // 1. Write to `accidents` table (simple, no FK — matches existing working data)
                const severityUpper = severityLevel.toUpperCase(); // 'HIGH' / 'MEDIUM' / 'LOW'
                const [accSimpleRows] = await db.execute(
                    'INSERT INTO accidents (severity_score, severity_level, vehicle_count, image_path, latitude, longitude, camera_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [result.severity_score, severityUpper, result.vehicle_count || 0, imagePath, lat, lng, cam_id]
                );
                insertedId = accSimpleRows.insertId;
                console.log(`[DB] ✅ Inserted into accidents table — id=${insertedId}`);

            } catch (dbErr1) {
                console.error('[DB] ❌ Failed to insert into accidents table:', dbErr1.message);
                fs.appendFileSync('db_error.log', `[${new Date().toISOString()}] accidents INSERT FAILED:\n${dbErr1.stack}\n`);
            }

            try {
                let road_id = 101; 
                let authority_id = 201;
                
                const roadName = req.body.road_name || 'Unknown Road';
                const areaName = req.body.area_name || 'Unknown Area';
                const cityName = req.body.city_name || 'Unknown City';

                // Look up or dynamically generate relational masters for new locations!
                if (roadName !== 'Default Road' && roadName !== 'Unknown Road') {
                    // 1. Try to find area
                    let [areaRows] = await db.execute('SELECT area_id FROM area WHERE area_name = ? LIMIT 1', [areaName]);
                    let area_id;
                    if (areaRows.length === 0) {
                        const [insertArea] = await db.execute("INSERT INTO area (area_name, city, area_rating) VALUES (?, ?, 'High Risk')", [areaName, cityName]);
                        area_id = insertArea.insertId;
                    } else {
                        area_id = areaRows[0].area_id;
                    }

                    // 2. Try to find road
                    let [rRows] = await db.execute('SELECT road_id FROM road WHERE road_name = ? LIMIT 1', [roadName]);
                    if (rRows.length === 0) {
                        const [insertRoad] = await db.execute("INSERT INTO road (road_name, road_type, speed_limit, area_id) VALUES (?, 'Street', 40, ?)", [roadName, area_id]);
                        road_id = insertRoad.insertId;
                    } else {
                        road_id = rRows[0].road_id;
                    }

                    // 3. Try to find authority for this specific area
                    let [authRows] = await db.execute('SELECT authority_id FROM authority WHERE area_id = ? LIMIT 1', [area_id]);
                    if (authRows.length === 0) {
                        const [insAuth] = await db.execute("INSERT INTO authority (authority_name, role, contact_email, area_id) VALUES (?, 'Police', ?, ?)", [`Inspector of ${areaName}`, `disptach@${areaName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}.gov`, area_id]);
                        authority_id = insAuth.insertId;
                        console.log(`[DB] ✅ Created NEW Authority Region: Inspector of ${areaName}`);
                    } else {
                        authority_id = authRows[0].authority_id;
                    }
                } else {
                    road_id = parseInt(req.body.road_id) || 101;
                    const [authRows] = await db.execute('SELECT auth.authority_id FROM authority auth JOIN road r ON r.area_id = auth.area_id WHERE r.road_id = ? LIMIT 1', [road_id]);
                    authority_id = authRows.length > 0 ? authRows[0].authority_id : 201;
                }

                const currentDate = new Date().toISOString().slice(0, 10);
                const currentTime = new Date().toTimeString().split(' ')[0];

                const weatherCondition = result.weather_condition || ['Clear', 'Rainy', 'Cloudy', 'Foggy'][Math.floor(Math.random() * 4)];
                const visibilityLevel  = result.visibility_level  || ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)];
                const locDesc = result.accident_detected ? `Auto Detected | Cam: ${cam_id} | Lat: ${lat || '0.00'}, Lng: ${lng || '0.00'} | Loc: ${roadName}, ${areaName}` : `Normal Traffic | Cam: ${cam_id} | Lat: ${lat || '0.00'}, Lng: ${lng || '0.00'}`;

                const [accRows] = await db.execute(
                    'INSERT INTO accident (accident_date, accident_time, location_description, weather_condition, visibility_level, image_path, severity_level, confidence_score, road_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [currentDate, currentTime, locDesc, weatherCondition, visibilityLevel, annotatedImagePath, severityLevel, result.confidence !== undefined ? result.confidence : 0, road_id]
                );
                insertedAccidentId = accRows.insertId;
                console.log(`[DB] ✅ Inserted into accident table — accident_id=${insertedAccidentId}`);

                // 2.1 Write to `image_features` table (Relational Schema)
                const damageScore = (result.severity_score * 100).toFixed(2);
                const impactZones = ['Front-Left', 'Front-Right', 'Rear', 'Side-Center'];
                const impactZone = result.severity_score > 0.6 ? impactZones[0] : impactZones[1];
                
                await db.execute(
                    'INSERT INTO image_features (damage_score, edge_density, impact_zone, accident_id) VALUES (?, ?, ?, ?)',
                    [damageScore, result.confidence || 0, impactZone, insertedAccidentId]
                );

                // Grab the auto-generated alert and assign the dynamically calculated authority
                await db.execute(
                    'UPDATE alert SET authority_id = ? WHERE accident_id = ?',
                    [authority_id, insertedAccidentId]
                );
                console.log(`[DB] ✅ Updated auto-generated alert with dynamic authority_id=${authority_id}`);

            } catch (dbErr2) {
                console.error('[DB] ❌ Failed to process relational inserts:', dbErr2.message);
                fs.appendFileSync('db_error.log', `[${new Date().toISOString()}] Relational INSERT FAILED:\n${dbErr2.stack}\n`);
            }

            // Always return result to frontend
            res.json({
                ...result,
                severity_level: severityLevel,
                image_path: imagePath,
                annotated_image_path: annotatedImagePath,
                db_id: insertedId,
                accident_id: insertedAccidentId
            });

        } catch (e) {
            console.error(`[PARSE ERROR] ${e.message}`, stdout);
            fs.appendFileSync('server_error.log', `[${new Date().toISOString()}] PARSE ERROR: ${e.stack}\nStdout: ${stdout}\n`);
            res.status(500).json({ error: 'Failed to parse ML output', raw: stdout });
        }
    });
});

// ──────────────────────────────────────────────────────
// Route: Get all roads
// ──────────────────────────────────────────────────────
app.get('/roads', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT road_id, road_name, road_type, area_id FROM road');
        res.json(rows);
    } catch (error) {
        console.error('[DB] /roads error:', error.message);
        res.status(500).json({ error: 'Database query failed', details: error.message });
    }
});

// ──────────────────────────────────────────────────────
// Route: Admin Dashboard Stats
// ──────────────────────────────────────────────────────
app.get('/admin/dashboard', async (req, res) => {
    try {
        const [[accCount]] = await db.execute('SELECT COUNT(*) as total FROM accident');
        const [[highCount]] = await db.execute("SELECT COUNT(*) as high_cases FROM accident WHERE severity_level = 'High'");
        const [[alertCount]] = await db.execute("SELECT COUNT(*) as active_alerts FROM alert WHERE status != 'Resolved'");

        res.json({
            total_accidents: accCount.total,
            high_severity_cases: highCount.high_cases,
            active_alerts: alertCount.active_alerts
        });
    } catch (error) {
        console.error('[DB] /admin/dashboard error:', error.message);
        res.status(500).json({ error: 'Database query failed', details: error.message });
    }
});

// ──────────────────────────────────────────────────────
// Route: Get all accidents (simple table) — for timeline
// ──────────────────────────────────────────────────────
app.get('/admin/accidents', async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT accident_id as id, CONCAT(accident_date, " ", accident_time) as timestamp, confidence_score as severity_score, severity_level, 0 as vehicle_count, image_path FROM accident ORDER BY accident_date DESC, accident_time DESC'
        );
        res.json(rows);
    } catch (error) {
        console.error('[DB] /admin/accidents error:', error.message);
        res.status(500).json({ error: 'Database query failed', details: error.message });
    }
});

// ──────────────────────────────────────────────────────
// Route: Get all alerts — Admin table
// ──────────────────────────────────────────────────────
app.get('/admin/alerts', async (req, res) => {
    try {
        const query = `
            SELECT al.alert_id, al.priority_level, al.alert_time, al.status as alert_status,
                   ac.accident_id, ac.accident_date, ac.accident_time, ac.severity_level, ac.image_path,
                   ac.location_description, ac.weather_condition, ac.visibility_level,
                   img.damage_score, img.impact_zone, img.edge_density,
                   r.road_name, au.authority_name,
                   rsp.response_id, rsp.response_status, rsp.response_time
            FROM alert al
            JOIN accident ac ON al.accident_id = ac.accident_id
            JOIN road r ON ac.road_id = r.road_id
            LEFT JOIN image_features img ON ac.accident_id = img.accident_id
            LEFT JOIN authority au ON al.authority_id = au.authority_id
            LEFT JOIN response rsp ON al.alert_id = rsp.alert_id
            ORDER BY al.alert_time DESC
        `;
        const [rows] = await db.execute(query);
        res.json(rows);
    } catch (error) {
        console.error('[DB] /admin/alerts error:', error.message);
        res.status(500).json({ error: 'Database query failed', details: error.message });
    }
});

// ──────────────────────────────────────────────────────
// Route: Update Alert Response Status
// ──────────────────────────────────────────────────────
app.post('/admin/alerts/:id/status', async (req, res) => {
    try {
        const alert_id = req.params.id;
        const { status } = req.body;

        // Try updating existing response, if 0 rows, it means we need to INSERT the response
        const [upd] = await db.execute('UPDATE response SET response_status = ?, response_time = NOW() WHERE alert_id = ?', [status, alert_id]);
        
        if (upd.affectedRows === 0) {
            // Note: This INSERT will trigger 'update_alert_status' in the database and auto-resolve the alert!
            await db.execute('INSERT INTO response (response_status, response_time, alert_id) VALUES (?, NOW(), ?)', [status, alert_id]);
        }

        // If the DB trigger doesn't cover 'Acknowledged' states, we manually update the alert here just in case
        if (status !== 'Resolved') {
            await db.execute("UPDATE alert SET status = 'Acknowledged' WHERE alert_id = ?", [alert_id]);
        }

        res.json({ success: true, message: 'Status updated successfully' });
    } catch (error) {
        console.error('[DB] /admin/alerts/:id/status error:', error.message);
        res.status(500).json({ error: 'Update failed', details: error.message });
    }
});


// ──────────────────────────────────────────────────────
// Global error handlers
// ──────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
    fs.appendFileSync('crash.log', `[${new Date().toISOString()}] UNCAUGHT EXCEPTION:\n${err.stack}\n`);
});

process.on('unhandledRejection', (reason) => {
    console.error('UNHANDLED REJECTION:', reason);
    fs.appendFileSync('crash.log', `[${new Date().toISOString()}] UNHANDLED REJECTION:\n${reason}\n`);
});

app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`SERVER STARTED ON PORT ${PORT}`);
    console.log(`DB: ${process.env.DB_USER}@${process.env.DB_HOST}/${process.env.DB_DATABASE}`);
    console.log(`VISIT: http://localhost:${PORT}/`);
    console.log(`=========================================`);
});

setInterval(() => {}, 1000 * 60 * 60);
