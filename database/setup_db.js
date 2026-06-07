const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Sonu2007$sn'
});

connection.query('CREATE DATABASE IF NOT EXISTS accident_response_db', function(err, results) {
  if (err) {
    console.error('Error creating database:', err);
    process.exit(1);
  }
  console.log('Database created or already exists.');
  
  const connWithDB = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Sonu2007$sn',
    database: 'accident_response_db'
  });

  const schema = `
    CREATE TABLE IF NOT EXISTS accidents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        severity_score FLOAT NOT NULL,
        severity_level ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL,
        vehicle_count INT NOT NULL,
        image_path VARCHAR(255) NOT NULL
    );
  `;

  connWithDB.query(schema, function(err, results) {
    if (err) {
      console.error('Error creating table:', err);
      process.exit(1);
    }
    console.log('Table created or already exists.');
    process.exit(0);
  });
});
