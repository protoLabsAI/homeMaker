import { Zap } from 'lucide-react';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@protolabsai/ui/atoms';
import { ScrollArea } from '@protolabsai/ui/atoms';
import type { XpEvent } from '@protolabsai/types';

// ============================================================================
// Category badge colors
// ============================================================================

const SOURCE_CATEGORY_MAP: Record<string, string> = {
  maintenance: 'maintenance',
  inventory: 'inventory',
  budget: 'budget',
  quest: 'quest',
  achievement: 'achievement',
  streak: 'streak',
};

function categoryFromSource(source: string): string {
  for (const [key, val] of Object.entries(SOURCE_CATEGORY_MAP)) {
    if (source.toLowerCase().includes(key)) return val;
  }
  return 'other';
}

const CATEGORY_VARIANT: Record<string, 'success' | 'warning' | 'info' | 'muted'> = {
  maintenance: 'warning',
  inventory: 'info',
  budget: 'success',
  quest: 'success',
  achievement: 'success',
  streak: 'warning',
  other: 'muted',
};

// ============================================================================
// XP row
// ============================================================================

interface XpRowProps {
  event: XpEvent;
}

function XpRow({ event }: XpRowProps) {
  const category = categoryFromSource(event.source);
  const variant = CATEGORY_VARIANT[category] ?? 'muted';
  const total = event.amount * event.multiplier;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Zap className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground truncate">{event.source}</span>
          <Badge variant={variant} className="text-[10px] capitalize">
            {category}
          </Badge>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {new Date(event.timestamp).toLocaleString()}
          {event.multiplier > 1 && (
            <span className="ml-1 text-status-warning">×{event.multiplier} bonus</span>
          )}
        </p>
      </div>
      <span className="text-sm font-bold text-primary whitespace-nowrap">+{total} XP</span>
    </div>
  );
}

// ============================================================================
// XP history list
// ============================================================================

interface XpHistoryProps {
  events: XpEvent[];
}

export function XpHistory({ events }: XpHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent XP Gains</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 px-6">No XP earned yet</p>
        ) : (
          <ScrollArea className="h-72">
            <div className="px-6">
              {events.map((event, i) => (
                <XpRow key={`${event.timestamp}-${i}`} event={event} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
