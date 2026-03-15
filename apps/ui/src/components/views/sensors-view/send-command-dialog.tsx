/**
 * Send Command Dialog
 *
 * Modal dialog for dispatching a command to an IoT sensor.
 * Provides an action selector and an optional JSON payload textarea.
 * Validates payload JSON before submission.
 */

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Textarea,
} from '@protolabsai/ui/atoms';
import { useSendCommand } from './hooks/use-send-command';
import type { SensorCommandAction } from '@protolabsai/types';

const COMMAND_ACTIONS: SensorCommandAction[] = ['set', 'toggle', 'reboot'];

interface SendCommandDialogProps {
  sensorId: string;
  sensorName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendCommandDialog({
  sensorId,
  sensorName,
  open,
  onOpenChange,
}: SendCommandDialogProps) {
  const [action, setAction] = useState<SensorCommandAction>('set');
  const [payloadText, setPayloadText] = useState('');
  const [payloadError, setPayloadError] = useState<string | null>(null);

  const sendCommand = useSendCommand();

  const resetForm = useCallback(() => {
    setAction('set');
    setPayloadText('');
    setPayloadError(null);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        resetForm();
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, resetForm]
  );

  const handleSubmit = useCallback(() => {
    let payload: Record<string, unknown> | undefined;

    if (payloadText.trim()) {
      try {
        const parsed: unknown = JSON.parse(payloadText);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          setPayloadError('Payload must be a JSON object (e.g. {"key": "value"})');
          return;
        }
        payload = parsed as Record<string, unknown>;
      } catch {
        setPayloadError('Invalid JSON syntax');
        return;
      }
    }

    setPayloadError(null);

    sendCommand.mutate(
      { sensorId, action, payload },
      {
        onSuccess: () => {
          handleOpenChange(false);
        },
      }
    );
  }, [sensorId, action, payloadText, sendCommand, handleOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-popover border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Command</DialogTitle>
          <DialogDescription>
            Queue a command for <span className="font-medium text-foreground">{sensorName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Action selector */}
          <div className="space-y-2">
            <Label htmlFor="command-action">Action</Label>
            <div className="flex gap-2">
              {COMMAND_ACTIONS.map((cmd) => (
                <Button
                  key={cmd}
                  variant={action === cmd ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAction(cmd)}
                  type="button"
                >
                  {cmd}
                </Button>
              ))}
            </div>
          </div>

          {/* Payload textarea */}
          <div className="space-y-2">
            <Label htmlFor="command-payload">Payload (optional JSON)</Label>
            <Textarea
              id="command-payload"
              placeholder='{"key": "value"}'
              className="font-mono text-sm min-h-[80px]"
              value={payloadText}
              onChange={(e) => {
                setPayloadText(e.target.value);
                if (payloadError) setPayloadError(null);
              }}
            />
            {payloadError && <p className="text-xs text-destructive">{payloadError}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)} type="button">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={sendCommand.isPending} type="button">
            {sendCommand.isPending ? 'Sending...' : 'Send Command'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
