import { columnSource } from './a5210f76-d330-4baf-b48d-a981b6a00661.mjs';

function buildSqlFromSpec(spec) {
  const params = {};
  let paramCount = 0;
  const addParam = (val) => {
    const key = `p${paramCount++}`;
    params[key] = val;
    return `@${key}`;
  };
  const neededTables = /* @__PURE__ */ new Set();
  const registerColumn = (col) => {
    if (col && columnSource[col]) {
      neededTables.add(columnSource[col]);
      return `${columnSource[col]}.${col}`;
    }
    return col;
  };
  const selectParts = [];
  const groupByCols = [];
  if (Array.isArray(spec.columns) && spec.columns.length > 0) {
    spec.columns.forEach((col) => {
      const qualified = registerColumn(col);
      selectParts.push(`${qualified} AS ${col}`);
      groupByCols.push(qualified);
    });
  }
  if (Array.isArray(spec.metrics) && spec.metrics.length > 0) {
    spec.metrics.forEach((m) => {
      const qualified = registerColumn(m.field);
      const alias = m.alias.replace(/[^a-zA-Z0-9_]/g, "");
      selectParts.push(`${m.aggregation}(${qualified}) AS ${alias}`);
    });
  }
  const selectClause = selectParts.length > 0 ? selectParts.join(", ") : "*";
  const whereParts = [];
  if (Array.isArray(spec.filters)) {
    spec.filters.forEach((f) => {
      const qualified = registerColumn(f.field);
      let op = (f.operator || "=").toUpperCase();
      let val = f.value;
      if (op.includes("LIKE")) {
        val = `%${val}%`;
      }
      const token = addParam(val);
      whereParts.push(`${qualified} ${op} ${token}`);
    });
  }
  const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
  let fromTable = "Participation";
  let joinClause = "";
  if (neededTables.size === 1 && neededTables.has("Students")) {
    fromTable = "Students";
  } else if (neededTables.size === 1 && neededTables.has("Events")) {
    fromTable = "Events";
  } else {
    fromTable = "Participation";
    if (neededTables.has("Students")) {
      joinClause += " INNER JOIN Students ON Participation.student_id = Students.student_id";
    }
    if (neededTables.has("Events")) {
      joinClause += " INNER JOIN Events ON Participation.event_id = Events.event_id";
    }
  }
  let groupByClause = "";
  if (spec.metrics && spec.metrics.length > 0 && groupByCols.length > 0) {
    groupByClause = `GROUP BY ${groupByCols.join(", ")}`;
  }
  let orderClause = "";
  if (spec.orderBy && spec.orderBy.field) {
    const field = spec.orderBy.field;
    const dir = (spec.orderBy.direction || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";
    const metricAliases = (spec.metrics || []).map((m) => m.alias);
    const isAlias = metricAliases.includes(field);
    if (isAlias) {
      const cleanAlias = field.replace(/[^a-zA-Z0-9_]/g, "");
      orderClause = `ORDER BY ${cleanAlias} ${dir}`;
    } else if (columnSource[field]) {
      const qualified = registerColumn(field);
      orderClause = `ORDER BY ${qualified} ${dir}`;
    } else {
      console.warn(`Ignored invalid orderBy field: ${field}`);
    }
  }
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

export { buildSqlFromSpec };
