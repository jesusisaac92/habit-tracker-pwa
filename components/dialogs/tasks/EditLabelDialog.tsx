import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/primitives/dialog";
import { Input } from "@/components/ui/primitives/input";
import { Button } from "@/components/ui/primitives/button";
import { useTranslation } from "next-i18next";
import { useState } from "react";

interface EditLabelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  label: { id: string; name: string; color: string };
  onSave: (id: string, updates: { name?: string; color?: string }) => void;
}

export const EditLabelDialog = ({ isOpen, onClose, label, onSave }: EditLabelDialogProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState(label.name);
  const [color, setColor] = useState(label.color);

  const handleSave = () => {
    onSave(label.id, { name, color });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('tasks.labels.edit.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('tasks.labels.namePlaceholder')}
            />
          </div>
          <div>
            <Input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-full"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 