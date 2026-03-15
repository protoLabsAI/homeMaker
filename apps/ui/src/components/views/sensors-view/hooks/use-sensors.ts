/**
 * Sensors Hook
 *
 * Fetches all registered sensors from GET /api/sensors with 10-second polling.
 * Subscribes to the WebSocket `sensor:data-received` event so that card state
 * badges and latest readings update in real time without waiting for the next poll.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet } from '@/lib/api-fetch';
import { getHttpApiClient } from '@/lib/http-api-client';
import type { SensorConfig, SensorReading, SensorState } from '@protolabsai/types';
import type { EventType } from '@protolabsai/types';

/** Shape returned by each element in the GET /api/sensors response */
export interface SensorEntry {
  sensor: SensorConfig;
  reading?: SensorReading;
  state: SensorState;
}

interface SensorsListResponse {
  success: boolean;
  sensors: SensorEntry[];
  total: number;
  error?: string;
}

interface UseSensorsResult {
  sensors: SensorEntry[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/** Polling interval in milliseconds */
const POLL_INTERVAL_MS = 10_000;

/** WebSocket event types that should trigger an immediate refetch */
const SENSOR_WS_EVENTS: EventType[] = ['sensor:data-received', 'sensor:registered'];

/**
 * Fetch all sensors, poll every 10 seconds, and subscribe to WebSocket events
 * for real-time updates when new readings arrive.
 */
export function useSensors(): UseSensorsResult {
  const [sensors, setSensors] = useState<SensorEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

  const fetchSensors = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiGet<SensorsListResponse>('/api/sensors');

      if (fetchId !== fetchIdRef.current) return;

      if (result.success) {
        setSensors(result.sensors);
      } else {
        setError(result.error ?? 'Failed to fetch sensors');
        setSensors([]);
      }
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to fetch sensors');
      setSensors([]);
    } finally {
      if (fetchId === fetchIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSensors();
  }, [fetchSensors]);

  // Poll every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      void fetchSensors();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchSensors]);

  // Subscribe to WebSocket sensor events for real-time updates
  useEffect(() => {
    const api = getHttpApiClient();

    const unsubscribe = api.subscribeToEvents((type: EventType) => {
      if (!SENSOR_WS_EVENTS.includes(type)) return;
      void fetchSensors();
    });

    return () => {
      unsubscribe();
    };
  }, [fetchSensors]);

  return {
    sensors,
    isLoading,
    error,
    refetch: fetchSensors,
  };
}
