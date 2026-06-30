import { spawn } from "child_process";
import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { type NextRequest, NextResponse } from "next/server";
import os from "os";
import path from "path";

// Use OS temp directory for better compatibility in containerized environments
const TEMP_BASE = path.join(os.tmpdir(), "openjkn-ai");
const UPLOAD_DIR = path.join(TEMP_BASE, "uploads");
const OUTPUT_DIR = path.join(TEMP_BASE, "outputs_enrollment");

// Python interpreter: override via PYTHON_BIN when not on PATH (e.g. deployments).
const PYTHON_BIN = process.env.PYTHON_BIN ?? "python3";

// Ensure directories exist
async function ensureDirs() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDirs();

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "text/csv",
      "application/octet-stream",
      "application/x-stata",
    ];
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    if (fileExtension !== "csv" && fileExtension !== "dta") {
      return NextResponse.json(
        { error: "Invalid file type. Only CSV and DTA files are allowed." },
        { status: 400 }
      );
    }

    // Save uploaded file
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name}`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Run Python scoring script
    const scriptPath = path.join(process.cwd(), "ai", "run_score.py");
    const result = await runPythonScript(scriptPath, filePath);

    // Parse the output CSV
    const scoredDataPath = path.join(OUTPUT_DIR, "scored_new_data.csv");
    const anomaliesDataPath = path.join(OUTPUT_DIR, "anomalies_new_data.csv");

    let scoredData: unknown[] | null = null;
    let anomaliesData: unknown[] | null = null;
    let summary: Record<string, number> | null = null;

    if (existsSync(scoredDataPath)) {
      scoredData = await parseCsvFile(scoredDataPath);
    }

    if (existsSync(anomaliesDataPath)) {
      anomaliesData = await parseCsvFile(anomaliesDataPath);
    }

    // Calculate summary
    if (scoredData) {
      const totalRecords = scoredData.length;
      const anomaliesCount = anomaliesData?.length || 0;
      const anomalyRate =
        totalRecords > 0 ? (anomaliesCount / totalRecords) * 100 : 0;

      // Count by source
      const sourceCounts: Record<string, number> = {};
      anomaliesData?.forEach((record: unknown) => {
        const r = record as { anomaly_source?: string };
        const source = r.anomaly_source || "unknown";
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });

      summary = {
        totalRecords,
        anomaliesCount,
        anomalyRate: Math.round(anomalyRate * 100) / 100,
        ruleBased:
          (sourceCounts["rule_only"] || 0) + (sourceCounts["model+rule"] || 0),
        modelBased:
          (sourceCounts["model_only"] || 0) + (sourceCounts["model+rule"] || 0),
      };
    }

    return NextResponse.json({
      success: true,
      fileName,
      summary,
      scoredData: scoredData ? sliceData(scoredData, 100) : null,
      anomalies: anomaliesData ? sliceData(anomaliesData, 50) : null,
      images: {
        dashboard: "/api/ai/images/dashboard.png",
        ageDistribution: "/api/ai/images/age-distribution.png",
        trainingHistory: "/api/ai/images/training-history.png",
      },
    });
  } catch (error) {
    console.error("Anomaly detection error:", error);
    return NextResponse.json(
      {
        error: "Failed to process file",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Run Python script and return output
function runPythonScript(
  scriptPath: string,
  dataPath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const python = spawn(PYTHON_BIN, ["-u", scriptPath, dataPath], {
      env: {
        ...process.env,
        OPENJKN_AI_OUTPUT_DIR: OUTPUT_DIR,
      },
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
      if (code === 0) {
        resolve(output);
      } else {
        reject(
          new Error(
            `Python script exited with code ${code}:\n--- STDOUT ---\n${output}\n--- STDERR ---\n${errorOutput}`
          )
        );
      }
    });

    python.on("error", (err) => {
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });
  });
}

// Simple CSV parser for the output files
async function parseCsvFile(filePath: string): Promise<unknown[]> {
  const fs = await import("fs/promises");
  const content = await fs.readFile(filePath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim());

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);
  const data: unknown[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const record: Record<string, unknown> = {};

    headers.forEach((header, index) => {
      const value = values[index];
      // Try to parse as number
      const numValue = Number(value);
      record[header] =
        !Number.isNaN(numValue) && value !== "" ? numValue : value;
    });

    data.push(record);
  }

  return data;
}

// Simple CSV line parser (handles quoted values)
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());

  return result;
}

// Limit data size for response
function sliceData<T>(data: T[], maxItems: number): T[] {
  return data.slice(0, maxItems);
}
