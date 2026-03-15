/**
 * Sensors View
 *
 * Full-page dashboard displaying all registered IoT sensors as cards.
 * Each card shows the sensor name, id, state badge (active/stale/offline),
 * last-seen timestamp, and the latest data payload. The view polls every
 * 10 seconds and subscribes to WebSocket events for real-time updates.
 */

import { useSensors } from './hooks/use-sensors';
import { SensorCard } from './sensor-card';
import { PanelHeader } from '@/components/shared/panel-header';
import { SkeletonPulse, Spinner } from '@protolabsai/ui/atoms';
import { Cpu, RefreshCw } from 'lucide-react';

// ============================================================================
// Skeleton
// ============================================================================

function SensorsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={`skel-${i}`} className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-1.5">
              <SkeletonPulse className="h-4 w-32" />
              <SkeletonPulse className="h-3 w-24" />
            </div>
            <SkeletonPulse className="h-5 w-14 rounded-full" />
          </div>
          <SkeletonPulse className="mt-3 h-3 w-40" />
          <div className="mt-3 space-y-1">
            <SkeletonPulse className="h-3 w-20" />
            <SkeletonPulse className="h-3 w-full" />
            <SkeletonPulse className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1">
      <Cpu className="h-12 w-12 text-muted-foreground/30 mb-4" />
      <p className="text-sm text-muted-foreground">No sensors registered</p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        Sensors will appear here once they register via the API
      </p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SensorsView() {
  const { sensors, isLoading, error, refetch } = useSensors();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PanelHeader
        icon={Cpu}
        title="Sensors"
        badge={
          sensors.length > 0 ? (
            <span className="text-xs text-muted-foreground">
              {sensors.length} sensor{sensors.length !== 1 ? 's' : ''}
            </span>
          ) : undefined
        }
        actions={[
          {
            icon: RefreshCw,
            label: 'Refresh',
            onClick: refetch,
            loading: isLoading && sensors.length > 0,
          },
        ]}
      />

      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoading && sensors.length === 0 ? (
          <SensorsSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center flex-1 h-full">
            <Cpu className="h-10 w-10 text-destructive/30 mb-3" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : sensors.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="relative">
            {/* Subtle loading indicator during background refetches */}
            {isLoading && sensors.length > 0 && (
              <div className="absolute top-0 right-0 z-10">
                <Spinner className="h-4 w-4" />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sensors.map((entry) => (
                <SensorCard key={entry.sensor.id} entry={entry} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
