import { createClient, type RobotRock, type RobotRockConfig } from "./client.js";
import { getRobotRockApiBaseUrl } from "@robotrock/core";

/**
 * Read RobotRock client config from environment variables.
 *
 * - `ROBOTROCK_API_KEY` (required when not passed explicitly)
 * - `ROBOTROCK_BASE_URL` or `ROBOTROCK_API_URL` (optional)
 * - `ROBOTROCK_APP` (optional inbox app bucket)
 */
export function resolveRobotRockConfig(
  overrides?: Partial<RobotRockConfig>
): RobotRockConfig {
  const agentService = overrides?.agentService;
  const apiKey = overrides?.apiKey ?? process.env.ROBOTROCK_API_KEY;

  if (agentService && apiKey) {
    throw new Error(
      "RobotRock client cannot configure both apiKey and agentService."
    );
  }

  const baseUrl = overrides?.baseUrl ?? getRobotRockApiBaseUrl();
  const app = overrides?.app ?? process.env.ROBOTROCK_APP;

  if (agentService) {
    return app
      ? { agentService, baseUrl, app }
      : { agentService, baseUrl };
  }

  if (!apiKey) {
    throw new Error(
      "RobotRock API key is required. Set ROBOTROCK_API_KEY or pass agentService when creating the client."
    );
  }

  return app ? { apiKey, baseUrl, app } : { apiKey, baseUrl };
}

/** Use an explicit client or create one from env / optional config overrides. */
export function resolveRobotRockClient(
  client?: RobotRock,
  configOverrides?: Partial<RobotRockConfig>
): RobotRock {
  if (client) {
    return client;
  }
  return createClient(resolveRobotRockConfig(configOverrides));
}
