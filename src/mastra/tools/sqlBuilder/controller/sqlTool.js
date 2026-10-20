import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { buildSqlFromSpec } from '../service/service.js';
import { inputSchema } from '../Schema/inputOutputSchema.js';
import { executeQuery } from '../../../db.js';

let attemptCounter = 0;

export const sportsDayTool = createTool({
  id: "query-sports-day",
  description: "Extracts database parameters from user queries and fetches sports day data.",
  inputSchema: inputSchema,

  execute: async (props) => {
    const spec = props?.context ?? props?.data ?? props;
    
    console.log(`--- [PARSED SPEC OBJECT] ---`);
    console.dir(spec, { depth: null });

    if (!spec || typeof spec !== 'object') {
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
  },
});