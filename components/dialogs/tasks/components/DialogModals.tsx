import React from 'react';
import { ViewNoteDialog } from '../../common/ViewNoteDialog';
import { EditTaskDialog } from '../EditTaskDialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/primitives/alert-dialog';
import { useTranslation } from 'next-i18next';
import { Task } from '@/components/types/types';
import { ExtendedTask } from '@/store/useTaskStore';
import { logger } from '@/utils/logger';

interface DialogModalsProps {
  isViewingNote: boolean;
  isEditingTask: boolean;
  taskToDelete: Task | null;
  selectedTaskForNote: Task | null;
  taskToEdit: Task | null;
  onViewNoteClose: () => void;
  onEditTaskClose: () => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<ExtendedTask>) => void;
}

export const DialogModals = ({
  isViewingNote,
  isEditingTask,
  taskToDelete,
  selectedTaskForNote,
  taskToEdit,
  onViewNoteClose,
  onEditTaskClose,
  onDeleteCancel,
  onDeleteConfirm,
  onUpdateTask
}: DialogModalsProps) => {
  const { t, i18n } = useTranslation('common');
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  
  React.useEffect(() => {
    forceUpdate();
  }, [i18n.language]);

  logger.debug('Dialog language state:', { currentLanguage: i18n.language });

  return (
    <>
      <ViewNoteDialog
        isOpen={isViewingNote}
        onOpenChange={onViewNoteClose}
        viewingNote={{
          title: selectedTaskForNote?.title || undefined,
          note: selectedTaskForNote?.note || undefined
        }}
        emotions={[]}
        onEdit={() => {}}
      />
      
      <EditTaskDialog
        isOpen={isEditingTask}
        onOpenChange={onEditTaskClose}
        task={taskToEdit ? {
          ...taskToEdit,
          recurring_exceptions: taskToEdit.recurring_exceptions || {}
        } as ExtendedTask : null}
        onUpdateTask={onUpdateTask}
      />
      
      <AlertDialog open={!!taskToDelete} onOpenChange={() => onDeleteCancel()}>
        <AlertDialogContent className="fixed left-[50%] top-[50%] w-[95vw] max-w-md translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6 shadow-lg sm:w-full">
          <AlertDialogHeader className="space-y-3">
            <AlertDialogTitle className="text-lg font-semibold">
              {t('tasks.deleteConfirmation.title')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-600">
              {t('tasks.deleteConfirmation.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel className="mt-2 w-full border border-gray-300 sm:mt-0 sm:w-auto">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (taskToDelete) {
                  onDeleteConfirm(taskToDelete.id);
                }
                onDeleteCancel();
              }}
              className="w-full bg-red-500 hover:bg-red-600 sm:w-auto"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

interface DeleteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmationDialog = ({ isOpen, onClose, onConfirm }: DeleteConfirmationProps) => {
  const { t, i18n } = useTranslation('common');
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  
  React.useEffect(() => {
    forceUpdate();
  }, [i18n.language]);

  logger.debug('Delete confirmation dialog state:', {
    translationKeys: {
      title: t('tasks.deleteConfirmation.title'),
      description: t('tasks.deleteConfirmation.description')
    },
    currentLanguage: i18n.language
  });

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        isOpen ? 'visible' : 'invisible'
      }`}
    >
      {/* Overlay con blur */}
      <div 
        className={`absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Modal container */}
      <div 
        className={`relative bg-white rounded-lg shadow-lg w-full max-w-sm mx-auto transform transition-all ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Modal content */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('tasks.deleteConfirmation.title')}
          </h3>
          <p className="text-sm text-gray-600">
            {t('tasks.deleteConfirmation.description')}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2 p-4 sm:flex-row-reverse sm:px-6">
          <button
            onClick={onConfirm}
            className="w-full px-4 py-2 text-white bg-red-500 hover:bg-red-600 rounded-md sm:w-auto"
          >
            {t('common.delete')}
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 sm:w-auto"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};