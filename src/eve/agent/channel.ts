import type { AuthFn } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";
import { localDev, vercelOidc } from "eve/channels/auth";
import {
  eveSelfServiceAuth,
  robotrockAgentServiceAuth,
  robotrockUserContextAuth,
  type RobotrockUserContextAuthOptions,
} from "./auth.js";

export type RobotrockEveChannelOptions = {
  /** Your existing webapp auth — stacked after RobotRock user-context auth. */
  auth?: AuthFn<Request>[];
  /** Include RobotRock user-context + service auth. @default true */
  robotrock?: boolean;
  /** Include localDev() fallback. @default true when NODE_ENV !== "production" */
  localDev?: boolean;
  /** Optional Vercel OIDC allowlist (dashboard ↔ agent on Vercel). */
  vercelOidc?: Parameters<typeof vercelOidc>[0] | false;
  /** Options passed to robotrockUserContextAuth when robotrock is enabled. */
  userContextAuth?: RobotrockUserContextAuthOptions;
};

function shouldEnableLocalDev(explicit?: boolean): boolean {
  if (explicit !== undefined) {
    return explicit;
  }
  return process.env.NODE_ENV !== "production";
}

/**
 * Compose the default Eve HTTP channel with RobotRock dashboard auth stacked
 * alongside optional existing webapp authenticators.
 */
export function robotrockEveChannel(options?: RobotrockEveChannelOptions) {
  const auth: AuthFn<Request>[] = [];
  const includeRobotrock = options?.robotrock !== false;

  if (includeRobotrock) {
    auth.push(robotrockUserContextAuth(options?.userContextAuth));
  }

  if (options?.auth?.length) {
    auth.push(...options.auth);
  }

  if (includeRobotrock) {
    auth.push(robotrockAgentServiceAuth());
    auth.push(eveSelfServiceAuth());
  }

  if (options?.vercelOidc !== false) {
    auth.push(vercelOidc(options?.vercelOidc ?? undefined));
  }

  if (shouldEnableLocalDev(options?.localDev)) {
    auth.push(localDev());
  }

  return eveChannel({ auth });
}
