import { useCallback, useEffect, useState } from 'react';
import {
  Home,
  RefreshCw,
  Save,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button, Switch } from '@protolabsai/ui/atoms';
import { Spinner } from '@protolabsai/ui/atoms';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api-fetch';

// ─── Types ───────────────────────────────────────────────────────────────────

type ConnectionStatus = 'unknown' | 'connected' | 'disconnected' | 'error';

interface HAEntity {
  entityId: string;
  state: string;
  friendlyName: string;
  domain: string;
  lastChanged: string;
  syncEnabled: boolean;
}

interface HAConfig {
  url: string;
  accessToken: string;
  entitySyncMap?: Record<string, boolean>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const configs: Record<ConnectionStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    unknown: {
      label: 'Not tested',
      cls: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
      icon: <AlertCircle className="w-3 h-3" />,
    },
    connected: {
      label: 'Connected',
      cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      icon: <Wifi className="w-3 h-3" />,
    },
    disconnected: {
      label: 'Disconnected',
      cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
      icon: <WifiOff className="w-3 h-3" />,
    },
    error: {
      label: 'Error',
      cls: 'bg-red-500/15 text-red-400 border-red-500/30',
      icon: <AlertCircle className="w-3 h-3" />,
    },
  };

  const cfg = configs[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border',
        cfg.cls
      )}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function HASection() {
  const [url, setUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('unknown');
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
  const [entities, setEntities] = useState<HAEntity[]>([]);
  const [entitySyncMap, setEntitySyncMap] = useState<Record<string, boolean>>({});

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [loadingEntities, setLoadingEntities] = useState(false);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [entitiesError, setEntitiesError] = useState<string | null>(null);

  // ── Load saved config on mount ──────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      setLoadingConfig(true);
      try {
        const res = await apiFetch('/api/settings/global', 'GET');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          success: boolean;
          settings: { homeAssistant?: HAConfig };
        };
        if (data.settings.homeAssistant) {
          setUrl(data.settings.homeAssistant.url ?? '');
          setAccessToken(data.settings.homeAssistant.accessToken ?? '');
          setEntitySyncMap(data.settings.homeAssistant.entitySyncMap ?? {});
        }
      } catch (err) {
        console.error('Failed to load HA config:', err);
      } finally {
        setLoadingConfig(false);
      }
    })();
  }, []);

  // ── Save config ─────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSavingConfig(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await apiFetch('/api/settings/global', 'PUT', {
        body: {
          homeAssistant: {
            url: url.trim(),
            accessToken: accessToken.trim(),
            entitySyncMap,
          },
        },
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  // ── Test connection ─────────────────────────────────────────────────────────

  const handleTestConnection = async () => {
    if (!url.trim() || !accessToken.trim()) return;
    setTestingConnection(true);
    setConnectionMessage(null);

    try {
      const res = await apiFetch('/api/ha/test', 'POST', {
        body: { url: url.trim(), accessToken: accessToken.trim() },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = (await res.json()) as {
        success: boolean;
        data: { connected: boolean; message?: string; version?: string };
      };

      if (data.data.connected) {
        setConnectionStatus('connected');
        setConnectionMessage(data.data.version ? `HA ${data.data.version}` : null);
      } else {
        setConnectionStatus('disconnected');
        setConnectionMessage(data.data.message ?? null);
      }
    } catch (err) {
      setConnectionStatus('error');
      setConnectionMessage(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTestingConnection(false);
    }
  };

  // ── Load entities ───────────────────────────────────────────────────────────

  const fetchEntities = useCallback(async () => {
    setLoadingEntities(true);
    setEntitiesError(null);

    try {
      const res = await apiFetch('/api/ha/entities', 'GET');
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const data = (await res.json()) as { success: boolean; data: HAEntity[] };
      setEntities(data.data ?? []);
    } catch (err) {
      setEntitiesError(err instanceof Error ? err.message : 'Failed to load entities');
    } finally {
      setLoadingEntities(false);
    }
  }, []);

  // ── Toggle entity sync ──────────────────────────────────────────────────────

  const handleEntityToggle = async (entityId: string, enabled: boolean) => {
    const updated = { ...entitySyncMap, [entityId]: enabled };
    setEntitySyncMap(updated);

    // Optimistically update the entity list
    setEntities((prev) =>
      prev.map((e) => (e.entityId === entityId ? { ...e, syncEnabled: enabled } : e))
    );

    // Persist sync map to settings
    try {
      await apiFetch('/api/settings/global', 'PUT', {
        body: {
          homeAssistant: {
            url: url.trim(),
            accessToken: accessToken.trim(),
            entitySyncMap: updated,
          },
        },
      });
    } catch (err) {
      console.error('Failed to persist entity sync toggle:', err);
    }
  };

  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  // Group entities by domain for display
  const groupedEntities = entities.reduce<Record<string, HAEntity[]>>((acc, entity) => {
    if (!acc[entity.domain]) acc[entity.domain] = [];
    acc[entity.domain]!.push(entity);
    return acc;
  }, {});

  const isConfigured = url.trim() && accessToken.trim();

  return (
    <div
      className={cn(
        'rounded-lg overflow-hidden',
        'border border-border/50',
        'bg-gradient-to-br from-card/90 via-card/70 to-card/80 backdrop-blur-xl',
        'shadow-sm shadow-black/5'
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-transparent via-accent/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center border border-orange-500/20">
              <Home className="w-5 h-5 text-orange-400" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground tracking-tight">
                Home Assistant
              </h2>
              <ConnectionBadge status={connectionStatus} />
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground/80 ml-12">
          Connect to your Home Assistant instance to sync sensor entities into homeMaker.
        </p>
      </div>

      <div className="p-4 space-y-6">
        {/* ── Connection Settings ──────────────────────────────────────────── */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Connection Settings</h3>

          {/* URL */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Home Assistant URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://homeassistant.local:8123"
              className="w-full px-3 py-2 rounded-md border border-border/50 bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Access Token */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Long-Lived Access Token
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Enter your HA long-lived access token"
                className="w-full px-3 py-2 pr-10 rounded-md border border-border/50 bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground/60">
              Create a token in HA under Profile → Long-Lived Access Tokens.
            </p>
          </div>

          {/* Save / Test buttons */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={savingConfig || !isConfigured}
              className="gap-1.5"
            >
              {savingConfig ? (
                <Spinner size="sm" />
              ) : saveSuccess ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saveSuccess ? 'Saved' : 'Save'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testingConnection || !isConfigured}
              className="gap-1.5"
            >
              {testingConnection ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wifi className="w-3.5 h-3.5" />
              )}
              Test Connection
            </Button>
          </div>

          {/* Connection feedback */}
          {connectionMessage && (
            <p
              className={cn(
                'text-xs',
                connectionStatus === 'connected' ? 'text-emerald-400' : 'text-muted-foreground'
              )}
            >
              {connectionMessage}
            </p>
          )}

          {/* Save error */}
          {saveError && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {saveError}
            </div>
          )}
        </div>

        {/* ── Entity Mapping ───────────────────────────────────────────────── */}
        <div className="space-y-3 pt-4 border-t border-border/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-foreground">Entity Mapping</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select which HA entities to sync as homeMaker sensors.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchEntities}
              disabled={loadingEntities || !isConfigured}
              className="gap-1.5 shrink-0"
            >
              {loadingEntities ? <Spinner size="sm" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Discover
            </Button>
          </div>

          {entitiesError && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {entitiesError}
            </div>
          )}

          {entities.length === 0 && !loadingEntities && !entitiesError && (
            <div className="py-6 text-center">
              <Home className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No entities loaded yet.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Save your connection settings and click &ldquo;Discover&rdquo; to load HA entities.
              </p>
            </div>
          )}

          {entities.length > 0 && (
            <div className="space-y-4">
              {Object.entries(groupedEntities).map(([domain, domainEntities]) => (
                <div key={domain} className="space-y-1.5">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {domain}
                  </h4>
                  <div className="space-y-1">
                    {domainEntities.map((entity) => (
                      <div
                        key={entity.entityId}
                        className="flex items-center justify-between p-2.5 rounded-md bg-accent/20 border border-border/30 gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground truncate">
                              {entity.friendlyName}
                            </span>
                            <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-accent/40 text-muted-foreground font-mono">
                              {entity.state}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground/60 font-mono truncate mt-0.5">
                            {entity.entityId}
                          </p>
                        </div>
                        <Switch
                          checked={entitySyncMap[entity.entityId] ?? false}
                          onCheckedChange={(checked) =>
                            handleEntityToggle(entity.entityId, checked)
                          }
                          aria-label={`Toggle sync for ${entity.friendlyName}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
