import sql from 'mssql';
import 'dotenv/config';

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '1433', 10),
  options: {
    encrypt: false, // Set to true if using Azure; false for standard local instances
    trustServerCertificate: true, // Needed for local dev self-signed certs
  },
};

async function testConnection() {
  try {
    console.log('Connecting to MSSQL...');
    const pool = await sql.connect(config);
    console.log('Connected successfully!');

    // Test a basic diagnostic query
    const result = await pool.request().query('SELECT DB_NAME() AS currentDb, GETDATE() AS serverTime;');
    console.log('Connection Details:', result.recordset[0]);

    // Test query on your actual table
    const students = await pool.request().query('SELECT COUNT(*) AS totalStudents FROM Students;');
    console.log('Students Table Verification:', students.recordset[0]);

    await pool.close();
    console.log('Connection closed cleanly.');
  } catch (err) {
    console.error('Connection failed:', err.message);
  }
}

testConnection();