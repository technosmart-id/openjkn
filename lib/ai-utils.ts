import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { participant, type participantSegmentEnum } from "@/lib/db/schema/jkn";

// Use OS temp directory for better compatibility in containerized environments
export const TEMP_BASE = path.join(os.tmpdir(), "openjkn-ai");
export const UPLOAD_DIR = path.join(TEMP_BASE, "uploads");
export const OUTPUT_DIR = path.join(TEMP_BASE, "outputs_enrollment");

// Python interpreter: override via PYTHON_BIN when not on PATH (e.g. deployments).
const PYTHON_BIN = process.env.PYTHON_BIN ?? "python3";

// Ensure directories exist
export async function ensureDirs() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }
}

// Database schema → ML expected format mapping
export interface DatabaseAnalysisOptions {
  participantSegment?: (typeof participantSegmentEnum.enumValues)[number];
  isActive?: boolean;
  limit?: number;
}

// PISA code mapping for peran field
export const PISA_CODE_TO_ROLE: Record<string, string> = {
  "1": "PESERTA",
  "2": "ISTRI",
  "3": "SUAMI",
  "4": "ANAK",
  "5": "FAMILY_LAIN",
};

// Relationship to role mapping
export const RELATIONSHIP_TO_ROLE: Record<string, string> = {
  SUAMI: "SUAMI",
  ISTRI: "ISTRI",
  ANAK_TANGGUNGAN: "ANAK",
  ANAK_TIDAK_TANGGUNGAN: "ANAK",
  ORANG_TUA: "ORANG_TUA",
  FAMILY_LAIN: "FAMILY_LAIN",
};

export async function queryParticipantsForML(
  options: DatabaseAnalysisOptions = {}
): Promise<string> {
  const { participantSegment, isActive = true, limit = 50_000 } = options;

  try {
    // Build where conditions
    let whereClause: any;

    if (isActive !== undefined && participantSegment) {
      whereClause = and(
        eq(participant.isActive, isActive),
        eq(participant.participantSegment, participantSegment)
      );
    } else if (isActive !== undefined) {
      whereClause = eq(participant.isActive, isActive);
    } else if (participantSegment) {
      whereClause = eq(participant.participantSegment, participantSegment);
    }

    const participants = await db.query.participant.findMany({
      where: whereClause,
      with: {
        familyMembers: true,
      },
      limit,
    });

    // Transform data to ML expected format
    const mlRecords = transformToMLFormat(participants);

    // Write to temporary CSV file
    await ensureDirs();
    const timestamp = Date.now();
    const tempFileName = `db-export-${timestamp}.csv`;
    const tempFilePath = path.join(UPLOAD_DIR, tempFileName);

    await writeMLCsv(tempFilePath, mlRecords);

    return tempFilePath;
  } catch (queryError) {
    console.error("[Database Query Error]:", queryError);
    // Fallback: simple query without relations
    const participants = await db.query.participant.findMany({
      limit,
    });
    console.log(
      `[Fallback] Exporting ${participants.length} records without relations.`
    );
    const mlRecords = transformSimpleToMLFormat(participants);
    await ensureDirs();
    const tempFilePath = path.join(
      UPLOAD_DIR,
      `db-export-fallback-${Date.now()}.csv`
    );
    await writeMLCsv(tempFilePath, mlRecords);
    return tempFilePath;
  }
}

export interface MLRecord {
  PSTV01: string; // id_peserta
  PSTV02: string; // id_keluarga
  PSTV03: string; // tanggal_lahir
  PSTV04: string; // peran
  PSTV05: string; // jenis_kelamin
  PSTV06: string; // status_kawin
  PSTV07: string; // kelas_rawat
  PSTV08: string; // jenis_peserta
  PSTV15: string; // kapitasi
  PSTV17: string; // status_peserta
}

export function transformToMLFormat(participants: any[]): MLRecord[] {
  const records: MLRecord[] = [];
  for (const p of participants) {
    const idPeserta = p.bpjsNumber || `P${p.id}`;
    const idKeluarga = p.familyCardNumber;
    const birthDate = formatDate(p.birthDate);
    const peran = PISA_CODE_TO_ROLE["1"];
    const kapitasi = p.isActive ? "YA" : "TIDAK";
    const statusPeserta =
      p.statusPeserta || (p.isActive ? "AKTIF" : "NON_AKTIF");

    records.push({
      PSTV01: idPeserta,
      PSTV02: idKeluarga,
      PSTV03: birthDate,
      PSTV04: peran,
      PSTV05: p.gender,
      PSTV06: p.maritalStatus,
      PSTV07: p.treatmentClass,
      PSTV08: p.participantSegment,
      PSTV15: kapitasi,
      PSTV17: statusPeserta,
    });

    if (p.familyMembers) {
      for (const fm of p.familyMembers) {
        records.push({
          PSTV01: fm.bpjsNumber || `FM${fm.id}`,
          PSTV02: idKeluarga,
          PSTV03: formatDate(fm.birthDate),
          PSTV04: RELATIONSHIP_TO_ROLE[fm.relationship] || "FAMILY_LAIN",
          PSTV05: fm.gender,
          PSTV06: "BELUM_KAWIN",
          PSTV07: p.treatmentClass,
          PSTV08: p.participantSegment,
          PSTV15: "YA",
          PSTV17: "AKTIF",
        });
      }
    }
  }
  return records;
}

export function transformSimpleToMLFormat(participants: any[]): MLRecord[] {
  return participants.map((p) => ({
    PSTV01: p.bpjsNumber || `P${p.id}`,
    PSTV02: p.familyCardNumber,
    PSTV03: formatDate(p.birthDate),
    PSTV04: PISA_CODE_TO_ROLE["1"],
    PSTV05: p.gender,
    PSTV06: p.maritalStatus,
    PSTV07: p.treatmentClass,
    PSTV08: p.participantSegment,
    PSTV15: p.isActive ? "YA" : "TIDAK",
    PSTV17: p.statusPeserta || (p.isActive ? "AKTIF" : "NON_AKTIF"),
  }));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export async function writeMLCsv(
  filePath: string,
  records: MLRecord[]
): Promise<void> {
  const headers = [
    "PSTV01",
    "PSTV02",
    "PSTV03",
    "PSTV04",
    "PSTV05",
    "PSTV06",
    "PSTV07",
    "PSTV08",
    "PSTV15",
    "PSTV17",
  ];
  const csvLines = [headers.join(",")];
  for (const record of records) {
    csvLines.push(headers.map((h) => record[h as keyof MLRecord]).join(","));
  }
  await writeFile(filePath, csvLines.join("\n"));
}

export function runPythonScript(
  scriptPath: string,
  args: string[]
): Promise<string> {
  return new Promise((resolve, reject) => {
    const python = spawn(PYTHON_BIN, ["-u", scriptPath, ...args], {
      env: { ...process.env, OPENJKN_AI_OUTPUT_DIR: OUTPUT_DIR },
    });
    let output = "";
    let errorOutput = "";
    python.stdout.on("data", (data) => {
      output += data.toString();
    });
    python.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });
    python.on("close", (code) => {
      if (code === 0) resolve(output);
      else
        reject(
          new Error(
            `Python script exited with code ${code}:\n--- STDOUT ---\n${output}\n--- STDERR ---\n${errorOutput}`
          )
        );
    });
    python.on("error", (err) => {
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });
  });
}

export async function parseCsvFile(filePath: string): Promise<unknown[]> {
  const content = await (await import("node:fs/promises")).readFile(
    filePath,
    "utf-8"
  );
  const lines = content.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const record: any = {};
    headers.forEach((h, i) => {
      const v = values[i];
      const n = Number(v);
      record[h] = !Number.isNaN(n) && v !== "" ? n : v;
    });
    return record;
  });
}

export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else current += char;
  }
  result.push(current.trim());
  return result;
}
