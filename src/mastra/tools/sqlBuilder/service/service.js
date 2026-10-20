import { columnSource } from "../Schema/columnSource.js";

export function buildSqlFromSpec(spec) {
  const params = {};
  let paramCount = 0;

  const addParam = (val) => {
    const key = `p${paramCount++}`;
    params[key] = val;
    return `@${key}`;
  };

  // Track which tables are needed across all parts of the query
  const neededTables = new Set();

  const registerColumn = (col) => {
    if (col && columnSource[col]) {
      neededTables.add(columnSource[col]);
      return `${columnSource[col]}.${col}`;
    }
    return col; // Fallback for "*"
  };

  // A. SELECT Clause
  const selectParts = [];
  const groupByCols = [];

  // Plain (un-aggregated) columns
  if (Array.isArray(spec.columns) && spec.columns.length > 0) {
    spec.columns.forEach((col) => {
      const qualified = registerColumn(col);
      selectParts.push(`${qualified} AS ${col}`);;
      groupByCols.push(qualified);
    });
  }

  // Aggregated metrics (SUM, AVG, COUNT, etc.)
  if (Array.isArray(spec.metrics) && spec.metrics.length > 0) {
    spec.metrics.forEach((m) => {
      const qualified = registerColumn(m.field);
      const alias = m.alias.replace(/[^a-zA-Z0-9_]/g, "");
      selectParts.push(`${m.aggregation}(${qualified}) AS ${alias}`);
    });
  }

  const selectClause = selectParts.length > 0 ? selectParts.join(", ") : "*";

  // B. WHERE Clause
  const whereParts = [];
  if (Array.isArray(spec.filters)) {
    spec.filters.forEach((f) => {
      const qualified = registerColumn(f.field);
      let op = (f.operator || "=").toUpperCase();
      let val = f.value;

      // // Safe check whether textColumns is a Set OR an Array
      // const isText = textColumns instanceof Set 
      //   ? textColumns.has(f.field) 
      //   : Array.isArray(textColumns) && textColumns.includes(f.field);

      // // Force LIKE for any text column using equality
      // if (isText) {
      //   if (op === "=") op = "LIKE";
      //   if (op === "!=") op = "NOT LIKE";
      // }

      // Wrap wildcards whenever LIKE or NOT LIKE is used
      if (op.includes("LIKE")) {
        val = `%${val}%`;
      }

      const token = addParam(val);
      whereParts.push(`${qualified} ${op} ${token}`);
    });
  }
  const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
  

  // C. Dynamic JOINs (Only join what is actually referenced)
  // Decide the base table
  let fromTable = "Participation";
  let joinClause = "";

  // If we only need Students (e.g. just listing student names), no need for Participation
  if (neededTables.size === 1 && neededTables.has("Students")) {
    fromTable = "Students";
  } 
  // If we only need Events (e.g. event dates/categories), no need for Participation
  else if (neededTables.size === 1 && neededTables.has("Events")) {
    fromTable = "Events";
  } 
  // Otherwise, start from Participation and dynamically attach whichever tables are needed
  else {
    fromTable = "Participation";

    if (neededTables.has("Students")) {
      joinClause += " INNER JOIN Students ON Participation.student_id = Students.student_id";
    }

    if (neededTables.has("Events")) {
      joinClause += " INNER JOIN Events ON Participation.event_id = Events.event_id";
    }
  }
  
  // D. GROUP BY Clause
  // Only add GROUP BY if there are BOTH metrics AND un-aggregated columns
  let groupByClause = "";
  if (spec.metrics && spec.metrics.length > 0 && groupByCols.length > 0) {
    groupByClause = `GROUP BY ${groupByCols.join(", ")}`;
  }


  // E. ORDER BY Clause
  let orderClause = "";

  if (spec.orderBy && spec.orderBy.field) {
    const field = spec.orderBy.field;
    const dir = (spec.orderBy.direction || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

    // Check if it's an alias defined in metrics
    const metricAliases = (spec.metrics || []).map((m) => m.alias);
    const isAlias = metricAliases.includes(field);

    if (isAlias) {
      // Aliases can be ordered directly without table prefixes
      const cleanAlias = field.replace(/[^a-zA-Z0-9_]/g, "");
      orderClause = `ORDER BY ${cleanAlias} ${dir}`;
    } else if (columnSource[field]) {
      // If it's a known database column, register and qualify it (e.g. Students.grade)
      const qualified = registerColumn(field);
      orderClause = `ORDER BY ${qualified} ${dir}`;
    } else {
      // Unknown field, ignore or default
      console.warn(`Ignored invalid orderBy field: ${field}`);
    }
  }
  

  // F. Limit (MSSQL TOP)
  let rawLimit = parseInt(spec.limit, 10);
  if (isNaN(rawLimit) || rawLimit <= 0) {
    rawLimit = 20;
  }
  const safeLimit = Math.min(rawLimit, 50);
  const limitToken = addParam(safeLimit);

  const sql = `
    SELECT TOP (${limitToken}) ${selectClause}
    FROM ${fromTable}
    ${joinClause}
    ${whereClause}
    ${groupByClause}
    ${orderClause};
  `.replace(/\s+/g, " ").trim();

  return { sql, params };
}