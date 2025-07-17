import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/primitives/dialog";
import { Button } from "@/components/ui/primitives/button";
import { Textarea } from "@/components/ui/primitives/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/primitives/select";
import { useTranslation } from 'react-i18next';
import { emotions, getEmotionByEmoji, getEmojiByText, isValidEmotion } from '@/components/lib/emotions';

interface AddNoteDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  handleEmotionSelection: (value: string) => void;
  noteText: string;
  setNoteText: (text: string) => void;
  handleNoteSubmission: () => void;
}

export const AddNoteDialog: React.FC<AddNoteDialogProps> = ({
  isOpen,
  onOpenChange,
  handleEmotionSelection,
  noteText,
  setNoteText,
  handleNoteSubmission
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-[425px] bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
        <DialogHeader className="p-4 sm:p-6">
          <DialogTitle className="text-lg sm:text-xl font-semibold">
            {t('addNote.title')}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 mt-1">
            {t('addNote.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto p-4 sm:p-6">
          <Select onValueChange={handleEmotionSelection}>
            <SelectTrigger className="w-full text-sm">
              <SelectValue placeholder={t('addNote.moodPlaceholder')} />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-md max-h-[200px] overflow-y-auto emotion-list">
              {emotions.map((emotion) => (
                emotion.emoji && (
                  <SelectItem 
                    key={emotion.emoji} 
                    value={emotion.emoji}
                    className="flex items-center w-full justify-start text-sm transition-all duration-200 ease-in-out hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md p-2"
                  >
                    <span className="text-xl sm:text-2xl mr-2">{emotion.emoji}</span>
                    <span>{t(`emotions.${emotion.textKey}`)}</span>
                  </SelectItem>
                )
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder={t('addNote.notePlaceholder')}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="w-full text-sm"
          />
        </div>
        <DialogFooter className="p-4 sm:p-6 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
          <Button 
            onClick={handleNoteSubmission}
            className="w-full sm:w-auto px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors duration-300 shadow-sm"
          >
            {t('common.save')}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors duration-300"
          >
            {t('common.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};