import { ROBOTROCK_PLATFORM_USER_CONTEXT_PUBLIC_KEY_URL } from "./constants.js";

let cachedPublicKeyPem: string | null | undefined;

/** Resolve the platform RS256 public key used to verify dashboard user-context JWTs. */
export async function resolvePlatformUserContextPublicKeyPem(): Promise<
  string | null
> {
  const envOverride = process.env.ROBOTROCK_USER_CONTEXT_PUBLIC_KEY?.trim();
  if (envOverride) {
    return envOverride;
  }

  if (cachedPublicKeyPem !== undefined) {
    return cachedPublicKeyPem;
  }

  try {
    const response = await fetch(ROBOTROCK_PLATFORM_USER_CONTEXT_PUBLIC_KEY_URL, {
      headers: { Accept: "text/plain" },
    });
    if (!response.ok) {
      cachedPublicKeyPem = null;
      return null;
    }
    const pem = (await response.text()).trim();
    cachedPublicKeyPem = pem.length > 0 ? pem : null;
    return cachedPublicKeyPem;
  } catch {
    cachedPublicKeyPem = null;
    return null;
  }
}

/** Reset cached platform public key (tests only). */
export function resetPlatformUserContextPublicKeyCache(): void {
  cachedPublicKeyPem = undefined;
}
