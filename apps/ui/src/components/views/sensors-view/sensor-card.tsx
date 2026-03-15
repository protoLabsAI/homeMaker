/**
 * Sensor Card
 *
 * Displays a single sensor's name, id, state badge, last-seen timestamp,
 * and the latest data payload as key-value pairs. Offline sensors render
 * with reduced opacity to visually distinguish them from active ones.
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@protolabsai/ui/atoms';
import { Terminal } from 'lucide-react';
import type { SensorState } from '@protolabsai/types';
import type { SensorEntry } from './hooks/use-sensors';
import { SendCommandDialog } from './send-command-dialog';

// ============================================================================
// State Badge
// ============================================================================

const STATE_BADGE_STYLES: Record<SensorState, string> = {
  active: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  stale: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
  offline: 'bg-destructive/15 text-destructive',
};

function StateBadge({ state }: { state: SensorState }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        STATE_BADGE_STYLES[state]
      )}
    >
      <span
        className={cn(
          'inline-block h-1.5 w-1.5 rounded-full',
          state === 'active' && 'bg-emerald-500',
          state === 'stale' && 'bg-yellow-500',
          state === 'offline' && 'bg-destructive'
        )}
      />
      {state}
    </span>
  );
}

// ============================================================================
// Timestamp Formatter
// ============================================================================

function formatLastSeen(isoTimestamp: string | undefined): string {
  if (!isoTimestamp) return 'Never';
  const date = new Date(isoTimestamp);
  return date.toLocaleString();
}

// ============================================================================
// Data Payload Display
// ============================================================================

function DataPayload({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;

  return (
    <div className="mt-3 space-y-1">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        Latest Data
      </p>
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        {entries.map(([key, value]) => (
          <div key={key} className="contents">
            <span className="text-xs text-muted-foreground truncate">{key}</span>
            <span className="text-xs text-foreground truncate font-mono">{formatValue(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Format a sensor data value for display */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '--';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

// ============================================================================
// Main Component
// ============================================================================

interface SensorCardProps {
  entry: SensorEntry;
}

export function SensorCard({ entry }: SensorCardProps) {
  const { sensor, reading, state } = entry;
  const isOffline = state === 'offline';
  const [commandDialogOpen, setCommandDialogOpen] = useState(false);

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-4 transition-colors',
        isOffline && 'opacity-50'
      )}
    >
      {/* Header: name + state badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-foreground truncate">{sensor.name}</h3>
          <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">{sensor.id}</p>
        </div>
        <StateBadge state={state} />
      </div>

      {/* Last seen timestamp */}
      <p className="mt-2 text-xs text-muted-foreground">
        Last seen: {formatLastSeen(sensor.lastSeenAt)}
      </p>

      {/* Data payload key-value pairs */}
      {reading && <DataPayload data={reading.data} />}

      {/* Send Command button */}
      <div className="mt-3 pt-3 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          onClick={() => setCommandDialogOpen(true)}
        >
          <Terminal className="h-3.5 w-3.5" />
          Send Command
        </Button>
      </div>

      <SendCommandDialog
        sensorId={sensor.id}
        sensorName={sensor.name}
        open={commandDialogOpen}
        onOpenChange={setCommandDialogOpen}
      />
    </div>
  );
}
