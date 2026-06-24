/**
 * SatuSehat API Service
 * Handles OAuth2 authentication and API communication with SatuSehat (FHIR R4)
 */

import type {
  FHIRBundle,
  FHIROperationOutcome,
  FHIRPatient,
  FHIOrganization,
  FHIRCoverage,
  FHIRRelatedPerson,
  FHIREncounter,
  FHIRLocation,
  FHIRPractitioner,
} from "./fhir-types";

// Environment configuration
const SATUSEHAT_CONFIG = {
  apiUrl: (process.env.SATUSEHAT_API_URL || "https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1").trim(),
  authUrl:
    (process.env.SATUSEHAT_AUTH_URL ||
    "https://api-satusehat-stg.dto.kemkes.go.id/oauth2/v1").trim(),
  clientId: (process.env.SATUSEHAT_CLIENT_ID || "").trim(),
  clientSecret: (process.env.SATUSEHAT_CLIENT_SECRET || "").trim(),
  organizationId:
    (process.env.SATUSEHAT_ORGANIZATION_ID || "1000").trim(), // Default organization ID
} as const;

// Token cache
let tokenCache: {
  accessToken: string;
  expiresAt: number;
} | null = null;

/**
 * SatuSehat API Error
 */
export class SatuSehatError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: FHIROperationOutcome
  ) {
    super(message);
    this.name = "SatuSehatError";
  }
}

/**
 * Get OAuth2 access token
 * Uses client credentials grant
 */
export async function getAccessToken(): Promise<string> {
  // Check if cached token is still valid
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }

  if (!SATUSEHAT_CONFIG.clientId || !SATUSEHAT_CONFIG.clientSecret) {
    throw new SatuSehatError(
      "SatuSehat credentials not configured. Please set SATUSEHAT_CLIENT_ID and SATUSEHAT_CLIENT_SECRET environment variables."
    );
  }

  try {
    const response = await fetch(`${SATUSEHAT_CONFIG.authUrl}/accesstoken?grant_type=client_credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: SATUSEHAT_CONFIG.clientId,
        client_secret: SATUSEHAT_CONFIG.clientSecret,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new SatuSehatError(
        `Failed to get access token: ${response.statusText} - ${text}`,
        response.status
      );
    }

    const data = await response.json();

    // Cache the token (subtract 60 seconds for safety margin)
    tokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000 - 60_000,
    };

    return tokenCache.accessToken;
  } catch (error) {
    if (error instanceof SatuSehatError) {
      throw error;
    }
    throw new SatuSehatError(
      `Failed to get access token: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Make an authenticated request to SatuSehat API
 */
async function makeRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${SATUSEHAT_CONFIG.apiUrl}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/fhir+json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      // Try to parse as OperationOutcome
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/fhir+json")) {
        try {
          const outcome: FHIROperationOutcome = await response.json();
          const message =
            outcome.issue?.[0]?.diagnostics ||
            outcome.issue?.[0]?.details?.text ||
            "SatuSehat API error";
          throw new SatuSehatError(message, response.status, outcome);
        } catch {
          // Fall through to generic error
        }
      }

      const text = await response.text();
      throw new SatuSehatError(
        `SatuSehat API error: ${response.statusText} - ${text}`,
        response.status
      );
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof SatuSehatError) {
      throw error;
    }
    throw new SatuSehatError(
      `Request failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Retry logic for idempotent operations
 */
async function retryRequest<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      // Only retry on server errors or rate limiting
      if (
        error instanceof SatuSehatError &&
        error.statusCode &&
        error.statusCode >= 500
      ) {
        if (i < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
          continue;
        }
      }
      throw error;
    }
  }

  throw lastError || new Error("Retry failed");
}

/**
 * Create or update a Patient resource
 */
export async function upsertPatient(
  patient: FHIRPatient
): Promise<{ id: string; resource: FHIRPatient }> {
  const isUpdate = !!patient.id;

  const result = isUpdate
    ? await makeRequest<{ id: string; resource: FHIRPatient }>(
        `/Patient/${patient.id}`,
        {
          method: "PUT",
          body: JSON.stringify(patient),
        }
      )
    : await retryRequest(async () =>
        makeRequest<{ id: string; resource: FHIRPatient }>("/Patient", {
          method: "POST",
          body: JSON.stringify(patient),
        })
      );

  return result;
}

/**
 * Create or update an Organization resource
 */
export async function upsertOrganization(
  organization: FHIOrganization
): Promise<{ id: string; resource: FHIOrganization }> {
  const isUpdate = !!organization.id;

  const result = isUpdate
    ? await makeRequest<{ id: string; resource: FHIOrganization }>(
        `/Organization/${organization.id}`,
        {
          method: "PUT",
          body: JSON.stringify(organization),
        }
      )
    : await retryRequest(async () =>
        makeRequest<{ id: string; resource: FHIOrganization }>("/Organization", {
          method: "POST",
          body: JSON.stringify(organization),
        })
      );

  return result;
}

/**
 * Create or update a Coverage resource
 */
export async function upsertCoverage(
  coverage: FHIRCoverage
): Promise<{ id: string; resource: FHIRCoverage }> {
  const isUpdate = !!coverage.id;

  const result = isUpdate
    ? await makeRequest<{ id: string; resource: FHIRCoverage }>(
        `/Coverage/${coverage.id}`,
        {
          method: "PUT",
          body: JSON.stringify(coverage),
        }
      )
    : await retryRequest(async () =>
        makeRequest<{ id: string; resource: FHIRCoverage }>("/Coverage", {
          method: "POST",
          body: JSON.stringify(coverage),
        })
      );

  return result;
}

/**
 * Create or update a RelatedPerson resource
 */
export async function upsertRelatedPerson(
  relatedPerson: FHIRRelatedPerson
): Promise<{ id: string; resource: FHIRRelatedPerson }> {
  const isUpdate = !!relatedPerson.id;

  const result = isUpdate
    ? await makeRequest<{ id: string; resource: FHIRRelatedPerson }>(
        `/RelatedPerson/${relatedPerson.id}`,
        {
          method: "PUT",
          body: JSON.stringify(relatedPerson),
        }
      )
    : await retryRequest(async () =>
        makeRequest<{ id: string; resource: FHIRRelatedPerson }>(
          "/RelatedPerson",
          {
            method: "POST",
            body: JSON.stringify(relatedPerson),
          }
        )
      );

  return result;
}

/**
 * Execute a transaction bundle
 */
export async function executeBundle(
  bundle: FHIRBundle
): Promise<FHIRBundle> {
  return retryRequest(() =>
    makeRequest<FHIRBundle>("", {
      method: "POST",
      body: JSON.stringify(bundle),
    })
  );
}

/**
 * Create or update an Encounter resource
 */
export async function upsertEncounter(
  encounter: FHIREncounter
): Promise<{ id: string; resource: FHIREncounter }> {
  const isUpdate = !!encounter.id;

  const result = isUpdate
    ? await makeRequest<{ id: string; resource: FHIREncounter }>(
        `/Encounter/${encounter.id}`,
        {
          method: "PUT",
          body: JSON.stringify(encounter),
        }
      )
    : await retryRequest(async () =>
        makeRequest<{ id: string; resource: FHIREncounter }>("/Encounter", {
          method: "POST",
          body: JSON.stringify(encounter),
        })
      );

  return result;
}

/**
 * Create or update a Location resource
 */
export async function upsertLocation(
  location: FHIRLocation
): Promise<{ id: string; resource: FHIRLocation }> {
  const isUpdate = !!location.id;

  const result = isUpdate
    ? await makeRequest<{ id: string; resource: FHIRLocation }>(
        `/Location/${location.id}`,
        {
          method: "PUT",
          body: JSON.stringify(location),
        }
      )
    : await retryRequest(async () =>
        makeRequest<{ id: string; resource: FHIRLocation }>("/Location", {
          method: "POST",
          body: JSON.stringify(location),
        })
      );

  return result;
}

/**
 * Search for a patient by NIK
 */
export async function searchPatientByNIK(
  nik: string
): Promise<FHIRPatient | null> {
  try {
    const response = await makeRequest<{
      resourceType: string;
      entry?: Array<{ resource: FHIRPatient }>;
    }>(`/Patient?identifier=https://fhir.kemkes.go.id/id/nik|${nik}`);

    if (response.entry && response.entry.length > 0) {
      return response.entry[0]?.resource || null;
    }

    return null;
  } catch (error) {
    // Return null if not found
    if (error instanceof SatuSehatError && error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Search for a patient by BPJS number
 */
export async function searchPatientByBPJS(
  bpjsNumber: string
): Promise<FHIRPatient | null> {
  try {
    const response = await makeRequest<{
      resourceType: string;
      entry?: Array<{ resource: FHIRPatient }>;
    }>(`/Patient?identifier=https://fhir.kemkes.go.id/id/bpjs-kesehatan|${bpjsNumber}`);

    if (response.entry && response.entry.length > 0) {
      return response.entry[0]?.resource || null;
    }

    return null;
  } catch (error) {
    // Return null if not found
    if (error instanceof SatuSehatError && error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Search for an organization by code
 */
export async function searchOrganizationByCode(
  code: string
): Promise<FHIOrganization | null> {
  try {
    const response = await makeRequest<{
      resourceType: string;
      entry?: Array<{ resource: FHIOrganization }>;
    }>(`/Organization?identifier=https://fhir.kemkes.go.id/id/organization-faskes|${code}`);

    if (response.entry && response.entry.length > 0) {
      return response.entry[0]?.resource || null;
    }

    return null;
  } catch (error) {
    // Return null if not found
    if (error instanceof SatuSehatError && error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Search for a practitioner by NIK
 */
export async function searchPractitionerByNIK(
  nik: string
): Promise<FHIRPractitioner | null> {
  try {
    const response = await makeRequest<{
      resourceType: string;
      entry?: Array<{ resource: FHIRPractitioner }>;
    }>(`/Practitioner?identifier=https://fhir.kemkes.go.id/id/nik|${nik}`);

    if (response.entry && response.entry.length > 0) {
      return response.entry[0]?.resource || null;
    }

    return null;
  } catch (error) {
    if (error instanceof SatuSehatError && error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Get a patient by ID
 */
export async function getPatient(id: string): Promise<FHIRPatient> {
  return makeRequest<FHIRPatient>(`/Patient/${id}`);
}

/**
 * Delete a patient by ID
 */
export async function deletePatient(id: string): Promise<void> {
  await makeRequest(`/Patient/${id}`, { method: "DELETE" });
}

/**
 * Clear token cache (useful for testing or when token is revoked)
 */
export function clearTokenCache(): void {
  tokenCache = null;
}

/**
 * Check if SatuSehat is configured
 */
export function isConfigured(): boolean {
  return !!(
    SATUSEHAT_CONFIG.clientId && SATUSEHAT_CONFIG.clientSecret
  );
}

/**
 * Health check for SatuSehat API
 */
export async function healthCheck(): Promise<boolean> {
  try {
    // Try to get the metadata
    await fetch(`${SATUSEHAT_CONFIG.apiUrl}/metadata`, {
      signal: AbortSignal.timeout(10_000),
    });
    return true;
  } catch {
    return false;
  }
}
