/**
 * AI Provider — shared Anthropic provider for @ai-sdk/anthropic routes.
 *
 * Resolves credentials using the same chain as the Claude Agent SDK:
 * 1. Credentials from settings UI (data/credentials.json via settingsService)
 * 2. ANTHROPIC_API_KEY environment variable
 * 3. ANTHROPIC_AUTH_TOKEN environment variable
 * 4. Claude CLI OAuth token from credential files (~/.claude/.credentials.json)
 * 5. Claude CLI OAuth token from macOS Keychain ("Claude Code-credentials")
 *
 * All routes that call the Anthropic API via @ai-sdk/anthropic should use
 * getAnthropicModel() instead of importing `anthropic` directly, so they
 * work with CLI OAuth auth (Claude Max/Pro plans) and not just API keys.
 */

import { execSync } from 'node:child_process';
import { createAnthropic } from '@ai-sdk/anthropic';
import { getClaudeCredentialPaths, systemPathReadFile } from '@protolabsai/platform';
import { createLogger } from '@protolabsai/utils';

const logger = createLogger('AIProvider');

/** Cached provider instance — created once, reused across requests. */
let cachedProvider: ReturnType<typeof createAnthropic> | null = null;

/**
 * Credential resolver function — set by the server at boot to wire in
 * settingsService.getCredentials() without a circular import.
 */
let credentialResolver: (() => Promise<{ apiKeys?: { anthropic?: string } }>) | null = null;

/**
 * Register the credential resolver (called once at server startup).
 * This allows ai-provider to read credentials from settingsService
 * without importing the service directly.
 */
export function setCredentialResolver(
  resolver: () => Promise<{ apiKeys?: { anthropic?: string } }>
): void {
  credentialResolver = resolver;
  // Invalidate cache so next request picks up the resolver
  cachedProvider = null;
}

/**
 * Read the OAuth access token from Claude CLI credential files.
 * Supports:
 * - Claude Code format: { claudeAiOauth: { accessToken } }
 * - Legacy format: { oauth_token } or { access_token }
 */
async function readCliOAuthToken(): Promise<string | null> {
  const credentialPaths = getClaudeCredentialPaths();
  for (const credPath of credentialPaths) {
    try {
      const content = await systemPathReadFile(credPath);
      const creds = JSON.parse(content) as Record<string, unknown>;

      // Claude Code CLI format
      const claudeOauth = creds.claudeAiOauth as { accessToken?: string } | undefined;
      if (claudeOauth?.accessToken) {
        return claudeOauth.accessToken;
      }

      // Legacy formats
      if (typeof creds.oauth_token === 'string') return creds.oauth_token;
      if (typeof creds.access_token === 'string') return creds.access_token;
    } catch {
      // Continue to next credential path
    }
  }
  return null;
}

/**
 * Read the OAuth access token from the macOS Keychain.
 * Claude Code stores credentials in the system keychain under
 * the service name "Claude Code-credentials" as a JSON blob:
 * { claudeAiOauth: { accessToken, refreshToken, expiresAt } }
 */
function readKeychainOAuthToken(): string | null {
  if (process.platform !== 'darwin') return null;

  try {
    const raw = execSync('security find-generic-password -s "Claude Code-credentials" -w', {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    const creds = JSON.parse(raw) as Record<string, unknown>;
    const claudeOauth = creds.claudeAiOauth as { accessToken?: string } | undefined;
    if (claudeOauth?.accessToken) {
      return claudeOauth.accessToken;
    }
  } catch {
    // Keychain entry not found or not on macOS
  }
  return null;
}

/**
 * Create or return the cached Anthropic provider with proper auth.
 * Mirrors the credential resolution chain from claude-provider.ts buildEnv().
 */
async function getOrCreateProvider(): Promise<ReturnType<typeof createAnthropic>> {
  if (cachedProvider) return cachedProvider;

  // 1. Check credentials from settings UI (data/credentials.json)
  if (credentialResolver) {
    try {
      const credentials = await credentialResolver();
      if (credentials.apiKeys?.anthropic) {
        logger.info('Using API key from settings credentials');
        cachedProvider = createAnthropic({ apiKey: credentials.apiKeys.anthropic });
        return cachedProvider;
      }
    } catch {
      // Credentials not available, continue chain
    }
  }

  // 2. Check ANTHROPIC_API_KEY env var
  if (process.env.ANTHROPIC_API_KEY) {
    logger.info('Using ANTHROPIC_API_KEY from environment');
    cachedProvider = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return cachedProvider;
  }

  // 3. Check ANTHROPIC_AUTH_TOKEN env var
  if (process.env.ANTHROPIC_AUTH_TOKEN) {
    logger.info('Using ANTHROPIC_AUTH_TOKEN from environment');
    cachedProvider = createAnthropic({
      authToken: process.env.ANTHROPIC_AUTH_TOKEN,
      headers: { 'anthropic-beta': 'oauth-2025-04-20' },
    });
    return cachedProvider;
  }

  // 4. Read CLI OAuth token from credential files
  const fileToken = await readCliOAuthToken();
  if (fileToken) {
    logger.info('Using Claude CLI OAuth token (file) for AI SDK provider');
    cachedProvider = createAnthropic({
      authToken: fileToken,
      headers: { 'anthropic-beta': 'oauth-2025-04-20' },
    });
    return cachedProvider;
  }

  // 5. Read CLI OAuth token from macOS Keychain
  const keychainToken = readKeychainOAuthToken();
  if (keychainToken) {
    logger.info('Using Claude CLI OAuth token (keychain) for AI SDK provider');
    cachedProvider = createAnthropic({
      authToken: keychainToken,
      headers: { 'anthropic-beta': 'oauth-2025-04-20' },
    });
    return cachedProvider;
  }

  // 6. Fallback — let @ai-sdk/anthropic try its own defaults (will likely fail)
  logger.warn(
    'No API key or OAuth token found. AI SDK chat routes will fail. ' +
      'Set ANTHROPIC_API_KEY, enter a key in Settings, or authenticate via Claude CLI.'
  );
  cachedProvider = createAnthropic();
  return cachedProvider;
}

/**
 * Get an Anthropic model instance with proper authentication.
 * Drop-in replacement for `anthropic(modelId)` from @ai-sdk/anthropic.
 *
 * @param modelId - The model ID (e.g., 'claude-sonnet-4-6')
 * @returns A language model instance ready for streamText/generateText
 */
export async function getAnthropicModel(modelId: string) {
  const provider = await getOrCreateProvider();
  return provider(modelId);
}

/**
 * Invalidate the cached provider (e.g., after credentials change).
 */
export function resetAnthropicProvider(): void {
  cachedProvider = null;
}
