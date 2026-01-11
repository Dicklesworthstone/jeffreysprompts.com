/**
 * Authenticated API Client
 *
 * Wraps fetch() to automatically include authentication headers when user is logged in.
 * Falls back gracefully for unauthenticated users.
 */

import { getAccessToken, getCurrentUser } from "./credentials";

// Premium API base URL - use env var if available, otherwise default
const PREMIUM_API_URL = process.env.JFP_PREMIUM_API_URL ?? "https://pro.jeffreysprompts.com/api";

export interface ApiClientOptions {
  /** Base URL for API requests */
  baseUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
}

export interface ApiResponse<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

/**
 * API Client class that handles authenticated requests
 */
export class ApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? PREMIUM_API_URL;
    this.timeout = options.timeout ?? 30000; // 30 second default
  }

  /**
   * Make an authenticated request to the API
   * Automatically includes Authorization header if logged in
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`;

    // Get auth token (may be null for unauthenticated users)
    const token = await getAccessToken();

    // Build headers
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-JSON responses
      const contentType = response.headers.get("content-type");
      let data: T | undefined;
      let jsonParseError: string | undefined;

      if (contentType?.includes("application/json")) {
        try {
          data = (await response.json()) as T;
        } catch (parseErr) {
          // JSON parse failed - capture error for reporting
          jsonParseError = parseErr instanceof Error ? parseErr.message : "Invalid JSON";
        }
      }

      if (!response.ok) {
        // Extract error message from response body if available
        // Use type guards to safely extract string error messages
        const errorData = data as Record<string, unknown> | undefined;
        const errorField = errorData?.error;
        const messageField = errorData?.message;
        const errorMessage =
          (typeof errorField === "string" ? errorField : null) ||
          (typeof messageField === "string" ? messageField : null) ||
          response.statusText ||
          "Request failed";

        return {
          ok: false,
          status: response.status,
          error: errorMessage,
        };
      }

      // If response was OK but JSON parsing failed, return error
      if (jsonParseError && contentType?.includes("application/json")) {
        return {
          ok: false,
          status: response.status,
          error: `Invalid JSON response: ${jsonParseError}`,
        };
      }

      return {
        ok: true,
        status: response.status,
        data,
      };
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof Error && err.name === "AbortError") {
        return {
          ok: false,
          status: 0,
          error: "Request timed out",
        };
      }

      return {
        ok: false,
        status: 0,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  /**
   * Check if the current user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await getAccessToken();
    return token !== null;
  }

  /**
   * Get current user info (from local credentials)
   */
  async getUser(): Promise<{ email: string; tier: string; userId: string } | null> {
    return getCurrentUser();
  }

  /**
   * Verify authentication by making a request to the user info endpoint
   * This confirms the token is still valid with the server
   */
  async verifyAuth(): Promise<{ authenticated: boolean; user?: { email: string; tier: string } }> {
    const response = await this.get<{ email: string; tier: string }>("/cli/me");

    if (!response.ok) {
      return { authenticated: false };
    }

    return {
      authenticated: true,
      user: response.data,
    };
  }
}

/**
 * Default API client instance
 * Use this for most requests
 */
export const apiClient = new ApiClient();

/**
 * Create a new API client with custom options
 */
export function createApiClient(options: ApiClientOptions): ApiClient {
  return new ApiClient(options);
}

/**
 * Helper to check if an error is an authentication error (401)
 */
export function isAuthError(response: ApiResponse<unknown>): boolean {
  return response.status === 401;
}

/**
 * Helper to check if an error is a permission error (403)
 */
export function isPermissionError(response: ApiResponse<unknown>): boolean {
  return response.status === 403;
}

/**
 * Helper to check if an error is a not found error (404)
 */
export function isNotFoundError(response: ApiResponse<unknown>): boolean {
  return response.status === 404;
}

/**
 * Helper to check if request requires premium tier
 * Returns true if response indicates user needs to upgrade
 */
export function requiresPremium(response: ApiResponse<unknown>): boolean {
  return response.status === 403 && (response.error?.toLowerCase().includes("premium") ?? false);
}
