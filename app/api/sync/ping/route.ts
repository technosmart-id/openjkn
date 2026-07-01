import { NextResponse } from "next/server";
import { Pool } from "pg";

// Top-level regex for performance (Ultracite: useTopLevelRegex)
const LEADING_SLASH_REGEX = /^\//u;

type ParsedConnection = {
  host: string;
  port: string;
  user: string;
  database: string;
  masked: string;
};

/**
 * Build the masked `userinfo@` segment of a connection string URL.
 * The password is replaced with `****` so it is safe to display.
 */
function buildAuthSegment(url: URL): string {
  if (url.password) {
    return `${url.username}:****@`;
  }
  if (url.username) {
    return `${url.username}@`;
  }
  return "";
}

/**
 * Parse a PostgreSQL connection string into its parts, with the password
 * masked so it is safe to display in the UI.
 */
function parseConnectionString(connectionString: string): ParsedConnection {
  const url = new URL(connectionString);
  return {
    host: url.hostname,
    port: url.port || "5432",
    user: url.username,
    database: url.pathname.replace(LEADING_SLASH_REGEX, ""),
    masked: `${url.protocol}//${buildAuthSegment(url)}${url.host}${url.pathname}`,
  };
}

/**
 * GET /api/sync/ping
 * Opens a short-lived connection to the openIMIS database
 * (OPENIMIS_DATABASE_URL), runs a trivial query, and reports
 * reachability + round-trip latency.
 */
export async function GET() {
  const connectionString = process.env.OPENIMIS_DATABASE_URL;

  if (!connectionString) {
    return NextResponse.json({
      status: "error",
      connected: false,
      error: "OPENIMIS_DATABASE_URL is not defined",
      checkedAt: new Date().toISOString(),
    });
  }

  let parsed: ParsedConnection;
  try {
    parsed = parseConnectionString(connectionString);
  } catch {
    return NextResponse.json({
      status: "error",
      connected: false,
      error: "OPENIMIS_DATABASE_URL is not a valid connection string",
      checkedAt: new Date().toISOString(),
    });
  }

  const startedAt = Date.now();
  let pool: Pool | null = null;

  try {
    pool = new Pool({ connectionString, connectionTimeoutMillis: 5000 });
    const result = await pool.query(
      "SELECT version() AS version, NOW() AS server_time, current_database() AS database, current_user AS user_name"
    );
    const latencyMs = Date.now() - startedAt;
    const row = result.rows[0];

    return NextResponse.json({
      status: "connected",
      connected: true,
      latencyMs,
      version: row.version as string,
      serverTime: row.server_time as string,
      database: row.database as string,
      user: row.user_name as string,
      host: parsed.host,
      port: parsed.port,
      connectionString: parsed.masked,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: "error",
      connected: false,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown error",
      host: parsed.host,
      port: parsed.port,
      database: parsed.database,
      connectionString: parsed.masked,
      checkedAt: new Date().toISOString(),
    });
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}
