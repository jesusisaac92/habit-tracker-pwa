import React from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/primitives/alert-dialog';
import { useTranslation } from 'next-i18next';

interface DeleteTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleteSingle: () => void;
  onDeleteAll: () => void;
  isRecurring: boolean;
}

export const DeleteTaskDialog = ({ 
  isOpen, 
  onClose, 
  onDeleteSingle,
  onDeleteAll,
  isRecurring 
}: DeleteTaskDialogProps) => {
  const { t } = useTranslation('common');

  if (!isRecurring) {
    return (
      <AlertDialog open={isOpen} onOpenChange={onClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('tasks.deleteConfirmation.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('tasks.deleteConfirmation.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                onDeleteSingle();
                onClose();
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('tasks.delete.confirmTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('tasks.delete.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col gap-2">
          <AlertDialogAction 
            onClick={() => {
              onDeleteSingle();
              onClose();
            }}
            className="bg-white text-black border border-gray-300 hover:bg-gray-50"
          >
            {t('tasks.delete.deleteInstance')}
          </AlertDialogAction>
          <AlertDialogAction 
            onClick={() => {
              onDeleteAll();
              onClose();
            }}
            className="bg-red-500 hover:bg-red-600"
          >
            {t('tasks.delete.deleteAll')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}; 