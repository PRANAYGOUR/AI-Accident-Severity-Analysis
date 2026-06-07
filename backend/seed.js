const db = require('./db');

async function seed() {
    try {
        await db.execute("INSERT IGNORE INTO area (area_id, area_name, city, area_rating) VALUES (1, 'Chennai South', 'Chennai', 'High Risk'), (2, 'Chennai North', 'Chennai', 'Low Risk')");
        await db.execute("INSERT IGNORE INTO road (road_id, road_name, road_type, speed_limit, area_id) VALUES (101, 'GST Road', 'Highway', 80, 1), (102, 'OMR Road', 'Expressway', 60, 1), (103, 'ECR Road', 'Coastal Highway', 60, 1)");
        await db.execute("INSERT IGNORE INTO authority (authority_id, authority_name, role, contact_email, area_id) VALUES (201, 'Chennai Traffic Police - South', 'Police', 'south@police.com', 1), (202, 'Apollo Emergency Ambulance', 'Medical', 'apollo@hospital.com', 1), (203, 'Highway Patrol - North', 'Police', 'north@police.com', 2)");
        console.log('Master tables correctly seeded.');
    } catch(e) {
        console.error('Seed Error:', e.message);
    }
    process.exit(0);
}
seed();
