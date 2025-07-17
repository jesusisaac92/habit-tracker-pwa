import React from 'react';
import { useDialogStore } from '@/components/services/dialogManagement/dialogService';
import { DayTimelineDialog } from '@/components/dialogs/tasks/DayTimelineDialog';

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { dialogStack } = useDialogStore();

  const renderDialog = (type: string, dialogProps: any) => {
    switch (type) {
      case 'dayTimeline':
        return <DayTimelineDialog {...dialogProps} />;
      default:
        return null;
    }
  };

  return (
    <>
      {children}
      {dialogStack.map((dialog, index) => (
        <React.Fragment key={`${dialog.type}-${index}`}>
          {renderDialog(dialog.type, dialog.data)}
        </React.Fragment>
      ))}
    </>
  );
}; 