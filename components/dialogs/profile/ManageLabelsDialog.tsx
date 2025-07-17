import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/primitives/dialog";
import { Button } from "@/components/ui/primitives/button";
import { Input } from "@/components/ui/primitives/input";
import { useState, useCallback, useEffect } from "react";
import { TaskLabel } from "../../types/types";
import { HexColorPicker, HexColorInput } from "react-colorful";
import { Plus, X, Edit2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/providers/toast/use-toast";
import { useTaskLabels } from "@/components/types/types";
import { CenteredToast } from "@/components/ui/providers/toast/CenteredToast";
import { labelsService } from '@/src/supabase/services/labels.service';
import { supabase } from '@/src/supabase/config/client';

interface ManageLabelsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectLabel: (labelId: string) => void;
}

export const ManageLabelsDialog = ({
  isOpen,
  onOpenChange,
  onSelectLabel
}: ManageLabelsDialogProps) => {
  const { t } = useTranslation();
  const { labels, addCustomLabel, updateLabel, deleteCustomLabel } = useTaskLabels();
  const { toast } = useToast();
  
  const [newLabelName, setNewLabelName] = useState("");
  const [selectedColor, setSelectedColor] = useState("#000000");
  const [editingLabel, setEditingLabel] = useState<TaskLabel | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showCenteredToast, setShowCenteredToast] = useState(false);
  const [toastConfig, setToastConfig] = useState({
    title: '',
    description: '',
    variant: 'default' as 'default' | 'success' | 'error' | 'warning'
  });
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data } = await labelsService.getLabels(user.id);
        if (data) {
          data.forEach(label => addCustomLabel(label.name, label.color));
        }
      }
    };
    getUserId();
  }, []);

  const showNotification = (title: string, description: string, variant: 'success' | 'error' | 'warning') => {
    if (isMobile) {
      toast({
        title: title,
        description: description,
        variant: variant
      });
    } else {
      setToastConfig({ title, description, variant });
      setShowCenteredToast(true);
      setTimeout(() => setShowCenteredToast(false), 2000);
    }
  };

  const handleAddLabel = async () => {
    if (!newLabelName.trim() || !selectedColor || !userId) {
      showNotification(
        '',
        t('tasks.labels.requiredFields'),
        'error'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const { success, data } = await labelsService.createLabel(userId, {
        name: newLabelName.trim(),
        color: selectedColor
      });

      if (success && data) {
        const newLabel = addCustomLabel(newLabelName.trim(), selectedColor);
        
        showNotification(
          '',
          `Etiqueta "${newLabelName}" agregada correctamente`,
          'success'
        );
        
        setNewLabelName('');
        setSelectedColor('#000000');
      }
    } catch (error) {
      console.error('Error al añadir etiqueta:', error);
      showNotification(
        '',
        t('tasks.labels.addError'),
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditLabel = (label: TaskLabel) => {
    setEditingLabel(label);
    setNewLabelName(label.name);
    setSelectedColor(label.color);
  };

  const handleUpdateLabel = () => {
    if (!editingLabel || !newLabelName.trim() || !selectedColor) return;
    
    try {
      updateLabel(editingLabel.id, {
        name: newLabelName.trim(),
        color: selectedColor
      });
      
      toast({
        title: t('tasks.labels.success'),
        description: `Etiqueta "${newLabelName}" actualizada correctamente`,
        variant: "success",
        duration: 2000,
        position: "top"
      });
      
      setEditingLabel(null);
      setNewLabelName('');
      setSelectedColor('#000000');
    } catch (error) {
      console.error('Error al actualizar etiqueta:', error);
      toast({
        title: t('tasks.labels.error'),
        description: t('tasks.labels.updateError'),
        variant: "error",
        duration: 3000
      });
    }
  };

  const handleDeleteLabel = async (labelId: string) => {
    try {
      const labelToDelete = labels.find(label => label.id === labelId);
      const { success } = await labelsService.deleteLabel(labelId);
      
      if (success) {
        deleteCustomLabel(labelId);
        
        showNotification(
          '',
          `Etiqueta "${labelToDelete?.name}" eliminada correctamente`,
          'error'
        );
      }
    } catch (error) {
      console.error('Error al eliminar etiqueta:', error);
      showNotification(
        '',
        t('tasks.labels.deleteError'),
        'error'
      );
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent 
          className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] 
                    w-[95vw] sm:w-[400px] max-h-[90vh] 
                    bg-white dark:bg-gray-800 rounded-lg shadow-lg
                    overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          aria-describedby="manage-labels-description"
        >
          <div className="flex justify-between items-center px-4 py-3 border-b">
            <DialogTitle className="text-lg font-semibold">
              Gestionar Etiquetas
            </DialogTitle>
            <DialogDescription id="manage-labels-description" className="sr-only">
              Gestiona tus etiquetas personalizadas para organizar tus tareas
            </DialogDescription>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="w-6 h-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div className="space-y-4">
              <Input
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder={t('tasks.labels.namePlaceholder')}
              />
              
              <div className="space-y-2">
                <div 
                  className="h-8 rounded-md cursor-pointer"
                  style={{ backgroundColor: selectedColor }}
                  onClick={() => setShowColorPicker(prev => !prev)}
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">#</span>
                  <HexColorInput
                    color={selectedColor}
                    onChange={setSelectedColor}
                    className="border rounded px-2 py-1 text-sm w-full"
                  />
                </div>
                {showColorPicker && (
                  <div className="absolute z-50 mt-2 p-4 bg-white border rounded-lg shadow-lg">
                    <HexColorPicker 
                      color={selectedColor} 
                      onChange={setSelectedColor}
                    />
                    <div className="mt-4 flex justify-end">
                      <Button
                        onClick={() => setShowColorPicker(false)}
                        variant="outline"
                        className="mr-2"
                      >
                        {t('common.cancel')}
                      </Button>
                      <Button
                        onClick={() => {
                          setShowColorPicker(false);
                        }}
                      >
                        {t('common.use')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Button 
              onClick={handleAddLabel} 
              className="w-full"
              disabled={!newLabelName.trim()}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('tasks.labels.addNew')}
            </Button>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {labels.map((label: TaskLabel) => (
                <div 
                  key={label.id}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (onSelectLabel) {
                      onSelectLabel(label.id);
                      setTimeout(() => {
                        onOpenChange(false);
                      }, 100);
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: label.color }} 
                    />
                    <span>{label.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditLabel(label)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    {label.isCustom && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteLabel(label.id);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showCenteredToast && !isMobile && (
        <CenteredToast
          title={toastConfig.title}
          description={toastConfig.description}
          variant={toastConfig.variant}
          onOpenChange={(open) => !open && setShowCenteredToast(false)}
        />
      )}
    </>
  );
}; 