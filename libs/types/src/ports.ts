/**
 * Centralized port configuration for AutoMaker
 *
 * These ports are reserved for the Automaker application and should never be
 * killed or terminated by AI agents during feature implementation.
 */

/** Port for the static/UI server (Vite dev server) */
export const STATIC_PORT = 8578;

/** Port for the backend API server (Express + WebSocket) */
export const SERVER_PORT = 8579;

/** Array of all reserved Automaker ports */
export const RESERVED_PORTS = [STATIC_PORT, SERVER_PORT] as const;
