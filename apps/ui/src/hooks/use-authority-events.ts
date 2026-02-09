/**
 * Hook to subscribe to authority system WebSocket events
 */

import { useEffect, useState, useCallback } from 'react';
import { getHttpApiClient } from '@/lib/http-api-client';
import type { EventType } from '@automaker/types';

export interface AuthorityEvent {
  id: string;
  type: EventType;
  timestamp: number;
  message: string;
  agent?: string;
  featureId?: string;
  severity?: 'info' | 'success' | 'warning' | 'error';
}

/**
 * Extract human-readable message from authority event
 */
function formatAuthorityMessage(type: EventType, payload: any): string {
  switch (type) {
    case 'authority:pm-review-started':
      return `PM Agent reviewing PRD: ${payload.title || 'Untitled'}`;
    case 'authority:pm-review-approved':
      return `PM Agent approved PRD: ${payload.title || 'Untitled'}`;
    case 'authority:pm-review-changes-requested':
      return `PM Agent requested changes: ${payload.title || 'Untitled'}`;
    case 'authority:pm-research-started':
      return `PM Agent starting research phase`;
    case 'authority:pm-research-completed':
      return `PM Agent completed research`;
    case 'authority:pm-prd-ready':
      return `PM Agent finalized PRD`;
    case 'authority:pm-epic-created':
      return `PM Agent created epic: ${payload.title || 'Untitled'}`;
    case 'cos:prd-submitted':
      return `Chief of Staff submitted PRD: ${payload.title || 'Untitled'}`;
    case 'pr:feedback-received':
      return `EM Agent received PR feedback on #${payload.prNumber || '?'}`;
    case 'pr:changes-requested':
      return `Changes requested on PR #${payload.prNumber || '?'}`;
    case 'pr:approved':
      return `PR #${payload.prNumber || '?'} approved`;
    case 'feature:reassigned-for-fixes':
      return `Feature reassigned for PR fixes`;
    case 'authority:proposal-submitted':
      return `Agent submitted proposal: ${payload.action || 'Unknown'}`;
    case 'authority:approved':
      return `Proposal approved`;
    case 'authority:rejected':
      return `Proposal rejected`;
    default:
      return payload.message || `Authority event: ${type}`;
  }
}

/**
 * Determine severity from event type
 */
function getEventSeverity(type: EventType): AuthorityEvent['severity'] {
  if (type.includes('error') || type.includes('rejected')) return 'error';
  if (type.includes('changes-requested') || type.includes('feedback')) return 'warning';
  if (type.includes('approved') || type.includes('completed')) return 'success';
  return 'info';
}

/**
 * Hook to subscribe to authority events and maintain event list
 */
export function useAuthorityEvents(maxEvents: number = 50) {
  const [events, setEvents] = useState<AuthorityEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const addEvent = useCallback(
    (type: EventType, payload: any) => {
      const event: AuthorityEvent = {
        id: `${type}-${Date.now()}-${Math.random()}`,
        type,
        timestamp: Date.now(),
        message: formatAuthorityMessage(type, payload),
        agent: payload.agent,
        featureId: payload.featureId,
        severity: getEventSeverity(type),
      };

      setEvents((prev) => {
        const updated = [event, ...prev];
        return updated.slice(0, maxEvents); // Keep only most recent
      });
    },
    [maxEvents]
  );

  useEffect(() => {
    const api = getHttpApiClient();
    setIsConnected(true);

    // Subscribe to all authority-related events
    const authorityEventTypes: EventType[] = [
      'authority:proposal-submitted',
      'authority:approved',
      'authority:rejected',
      'authority:awaiting-approval',
      'authority:agent-registered',
      'authority:trust-updated',
      'authority:idea-injected',
      'authority:pm-review-started',
      'authority:pm-review-approved',
      'authority:pm-review-changes-requested',
      'authority:cto-approved-idea',
      'authority:pm-research-started',
      'authority:pm-research-completed',
      'authority:pm-prd-ready',
      'authority:pm-epic-created',
      'cos:prd-submitted',
      'pr:feedback-received',
      'pr:changes-requested',
      'pr:approved',
      'feature:reassigned-for-fixes',
    ];

    // Subscribe to each event type
    const unsubscribers = authorityEventTypes.map((eventType) => {
      return api['subscribeToEvent'](eventType, (payload: any) => {
        addEvent(eventType, payload);
      });
    });

    // Cleanup all subscriptions on unmount
    return () => {
      setIsConnected(false);
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [addEvent]);

  return { events, isConnected };
}
