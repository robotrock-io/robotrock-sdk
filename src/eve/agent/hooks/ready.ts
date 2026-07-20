import { defineHook } from "eve/hooks";

/**
 * Marker hook for RobotRock dashboard auto-detection.
 *
 * RobotRock reads `GET /eve/v1/info` on connect and treats deployments with a
 * hook slug `robotrock-ready` as RobotRock-ready.
 */
export const robotrockReadyHook = defineHook({});

/** Alias for agents that prefer a factory name. */
export function defineRobotRockReadyHook() {
  return defineHook({});
}
