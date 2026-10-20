import { createTool } from '@mastra/core/tools';
import { buildSqlFromSpec } from './6a2b074f-2938-4b8c-837d-778646ea50d8.mjs';
import { inputSchema } from './9fc3d9ef-d340-4414-8f5f-63a1e2c473a4.mjs';
import sql from 'mssql';
import './a5210f76-d330-4baf-b48d-a981b6a00661.mjs';
import 'zod';

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || "localhost",
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || "1433", 10),
  options: {
    encrypt: false,
    trustServerCertificate: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 3e4
  }
};
let poolPromise = null;
function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config).connect().then((pool) => {
      console.log("Connected to SQL Server successfully");
      return pool;
    }).catch((err) => {
      poolPromise = null;
      throw err;
    });
  }
  return poolPromise;
}
async function executeQuery(sqlText, params = {}) {
  const pool = await getPool();
  const request = pool.request();
  for (const [key, val] of Object.entries(params)) {
    request.input(key, val);
  }
  const result = await request.query(sqlText);
  return result.recordset || [];
}

let attemptCounter = 0;
const sportsDayTool = createTool({
  id: "query-sports-day",
  description: "Extracts database parameters from user queries and fetches sports day data.",
  inputSchema,
  execute: async (props) => {
    const spec = props?.context ?? props?.data ?? props;
    console.log(`--- [PARSED SPEC OBJECT] ---`);
    console.dir(spec, { depth: null });
    if (!spec || typeof spec !== "object") {
      console.error("Spec is undefined or not an object!");
      return { error: "No query parameters received." };
    }
    try {
      const { sql, params } = buildSqlFromSpec(spec);
      console.log(`--- [GENERATED SQL] ---`);
      console.log(sql);
      console.log(`--- [PARAMS] ---`, params);
      const records = await executeQuery(sql, params);
      console.log(`--- [RECORDS RETURNED] ---`);
      console.log(`Row count: ${records?.length ?? 0}`);
      attemptCounter = 0;
      return records;
    } catch (err) {
      console.error(`--- [TOOL EXECUTION ERROR] ---`);
      console.error(err);
      if (attemptCounter >= 2) {
        attemptCounter = 0;
        return { error: `Failed after 2 tries: ${err.message}` };
      }
      throw err;
    }
  }
});

export { sportsDayTool };
