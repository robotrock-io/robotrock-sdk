export {
  ROBOTROCK_USER_CONTEXT_AUDIENCE,
  ROBOTROCK_USER_CONTEXT_ISSUER,
} from "@robotrock/core/eve/user-context-jwt";
export { ROBOTROCK_PLATFORM_USER_CONTEXT_PUBLIC_KEY_URL } from "@robotrock/core/eve/platform-user-context-public-key";
export { ROBOTROCK_READY_HOOK_SLUG } from "../index.js";

/** Header carrying the dashboard user-context JWT on proxied Eve requests. */
export const ROBOTROCK_USER_CONTEXT_HEADER = "x-robotrock-user-token";
