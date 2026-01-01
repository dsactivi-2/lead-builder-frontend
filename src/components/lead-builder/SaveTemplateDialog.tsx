'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => void;
}

export function SaveTemplateDialog({ open, onOpenChange, onSave }: SaveTemplateDialogProps) {
  const [name, setName] = useState('');

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
      setName('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="save-template-dialog">
        <DialogHeader>
          <DialogTitle>Template speichern</DialogTitle>
          <DialogDescription>
            Gib einen Namen für dein Template ein, um es später wiederzuverwenden.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Input
            placeholder="Template-Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-testid="save-template-input"
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="save-template-cancel"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim()}
            data-testid="save-template-confirm"
          >
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
