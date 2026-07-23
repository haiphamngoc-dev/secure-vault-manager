export interface DatabaseTypeInfo {
  name: string;
  domain: string;
  aliases: string[];
  defaultIcon: string;
}

const makeSvg = (
  bgColor: string,
  fgColor: string,
  title: string,
  pathD?: string
) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <rect width="128" height="128" rx="28" fill="${bgColor}"/>
    ${pathD ? `<path d="${pathD}" fill="${fgColor}"/>` : ""}
    <text x="64" y="${pathD ? "102" : "74"}" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="${
      title.length > 8 ? "16" : title.length > 5 ? "20" : "24"
    }" fill="${pathD ? "#FFFFFF" : fgColor}" text-anchor="middle">${title}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const COMMON_DATABASE_TYPES: DatabaseTypeInfo[] = [
  {
    name: "MySQL",
    domain: "mysql.com",
    aliases: ["mysql"],
    defaultIcon: makeSvg(
      "#00758F",
      "#F29111",
      "MySQL",
      "M98 42c-2-4-8-7-14-6-6 1-10 6-12 12-4-2-9-3-14-1-6 2-10 7-12 13-6 0-12 4-15 9-4 6-4 13-2 20 2 6 7 11 13 14 7 3 15 3 22 0 6-3 11-8 14-14 3 2 7 3 12 2 5-1 9-5 11-10 3-7 1-15-3-21-3-4-7-7-12-8z"
    ),
  },
  {
    name: "PostgreSQL",
    domain: "postgresql.org",
    aliases: ["postgres", "postgresql", "psql", "pgsql"],
    defaultIcon: makeSvg(
      "#336791",
      "#FFFFFF",
      "PostgreSQL",
      "M64 24c-22 0-40 16-40 36 0 13 8 24 20 30v14l16-8c1.3.1 2.7.2 4 .2 22 0 40-16 40-36S86 24 64 24z"
    ),
  },
  {
    name: "MongoDB",
    domain: "mongodb.com",
    aliases: ["mongo", "mongodb"],
    defaultIcon: makeSvg(
      "#13AA52",
      "#FFFFFF",
      "MongoDB",
      "M64 20c0 0-24 28-24 52 0 14 10 24 24 28 14-4 24-14 24-28 0-24-24-52-24-52z"
    ),
  },
  {
    name: "Redis",
    domain: "redis.io",
    aliases: ["redis"],
    defaultIcon: makeSvg(
      "#DC382D",
      "#FFFFFF",
      "Redis",
      "M34 40l30-14 30 14-30 14zM34 56l30 14 30-14M34 72l30 14 30-14"
    ),
  },
  {
    name: "MariaDB",
    domain: "mariadb.org",
    aliases: ["mariadb"],
    defaultIcon: makeSvg("#003545", "#C09D51", "MariaDB"),
  },
  {
    name: "SQLite",
    domain: "sqlite.org",
    aliases: ["sqlite", "sqlite3"],
    defaultIcon: makeSvg(
      "#003B57",
      "#40B5E6",
      "SQLite",
      "M38 34h52v14H54v12h30v14H54v12h36v14H38Z"
    ),
  },
  {
    name: "Microsoft SQL Server",
    domain: "microsoft.com",
    aliases: ["mssql", "sqlserver", "sql server", "microsoft sql server"],
    defaultIcon: makeSvg("#CC292B", "#FFFFFF", "MSSQL"),
  },
  {
    name: "Oracle",
    domain: "oracle.com",
    aliases: ["oracle", "oracle db", "oracledb"],
    defaultIcon: makeSvg("#F80000", "#FFFFFF", "Oracle"),
  },
  {
    name: "Elasticsearch",
    domain: "elastic.co",
    aliases: ["elastic", "elasticsearch"],
    defaultIcon: makeSvg("#005571", "#00BFB3", "Elastic"),
  },
  {
    name: "Cassandra",
    domain: "cassandra.apache.org",
    aliases: ["cassandra", "apache cassandra"],
    defaultIcon: makeSvg("#1287B1", "#FFFFFF", "Cassandra"),
  },
  {
    name: "DynamoDB",
    domain: "aws.amazon.com",
    aliases: ["dynamodb", "dynamo", "aws dynamodb"],
    defaultIcon: makeSvg("#4053D6", "#FFFFFF", "DynamoDB"),
  },
  {
    name: "Supabase",
    domain: "supabase.com",
    aliases: ["supabase"],
    defaultIcon: makeSvg(
      "#1F1F1F",
      "#3ECF8E",
      "Supabase",
      "M68 24L32 72h32l-4 32 36-48H64l4-32z"
    ),
  },
  {
    name: "Firebase",
    domain: "firebase.google.com",
    aliases: ["firebase", "firestore", "realtime database"],
    defaultIcon: makeSvg("#051E34", "#FFCA28", "Firebase"),
  },
  {
    name: "ClickHouse",
    domain: "clickhouse.com",
    aliases: ["clickhouse"],
    defaultIcon: makeSvg("#FA4616", "#FFFFFF", "ClickHouse"),
  },
  {
    name: "CockroachDB",
    domain: "cockroachlabs.com",
    aliases: ["cockroach", "cockroachdb"],
    defaultIcon: makeSvg("#6933FF", "#FFFFFF", "Cockroach"),
  },
  {
    name: "Neo4j",
    domain: "neo4j.com",
    aliases: ["neo4j"],
    defaultIcon: makeSvg("#008CC1", "#FFFFFF", "Neo4j"),
  },
  {
    name: "InfluxDB",
    domain: "influxdata.com",
    aliases: ["influx", "influxdb"],
    defaultIcon: makeSvg("#22ADF6", "#FFFFFF", "InfluxDB"),
  },
  {
    name: "DuckDB",
    domain: "duckdb.org",
    aliases: ["duckdb"],
    defaultIcon: makeSvg("#FFF000", "#000000", "DuckDB"),
  },
];

export const DATABASE_TYPE_NAMES = COMMON_DATABASE_TYPES.map((db) => db.name);

export function getDatabaseTypeInfo(
  dbTypeName?: string
): DatabaseTypeInfo | undefined {
  if (!dbTypeName || !dbTypeName.trim()) return undefined;
  const normalized = dbTypeName.trim().toLowerCase();
  return COMMON_DATABASE_TYPES.find(
    (db) =>
      db.name.toLowerCase() === normalized ||
      db.aliases.some((alias) => alias.toLowerCase() === normalized)
  );
}

export function getDatabaseLogo(dbTypeName?: string): string | undefined {
  const info = getDatabaseTypeInfo(dbTypeName);
  return info?.defaultIcon;
}
