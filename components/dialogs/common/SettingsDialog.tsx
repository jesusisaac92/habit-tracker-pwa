"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/primitives/dialog";
import { Button } from "@/components/ui/primitives/button";
import { Settings, Moon, Sun, Laptop, X, Flag, Globe, Check, Eye } from "lucide-react";
import { useTheme } from "next-themes";
import { SettingsTabs, SettingsTabsList, SettingsTabsTrigger, TabsContent } from "@/components/ui/config/settings-tabs";
import { Label } from "@/components/ui/primitives/label";
import { Switch } from "@/components/ui/primitives/switch";
import { Separator } from "../../ui/primitives/separator";
import { useTranslation } from 'react-i18next';
import { usePathname } from 'next/navigation';
import { Select, SelectTrigger, SelectValue, SelectItem, SelectContent } from "@/components/ui/primitives/select";
import { useHabitManagement } from '@/components/custom-hooks/useHabitManagement';

interface SettingsDialogProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onHelpClick?: () => void;
}

export function SettingsDialog({ 
  isOpen, 
  onOpenChange, 
  onHelpClick 
}: SettingsDialogProps) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { 
    sortPreference, 
    setSortPreference, 
    showCompletedHabits, 
    setShowCompletedHabits 
  } = useHabitManagement();

  React.useEffect(() => {
    const savedLanguage = localStorage.getItem('preferredLanguage') || 'es';
    if (i18n && typeof i18n.changeLanguage === 'function') {
      i18n.changeLanguage(savedLanguage);
    }
  }, [i18n]);

  const handleLanguageChange = React.useCallback((language: string) => {
    localStorage.setItem('preferredLanguage', language);
    if (i18n && typeof i18n.changeLanguage === 'function') {
      i18n.changeLanguage(language);
    }
  }, [i18n]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-gray-900 border-none">
        <DialogHeader>
          <DialogTitle className="text-2xl">{t('settings.title')}</DialogTitle>
          <DialogDescription>
            {t('settings.description')}
          </DialogDescription>
        </DialogHeader>

        <SettingsTabs defaultValue="general" className="w-full">
          <SettingsTabsList className="mb-6">
            <SettingsTabsTrigger value="general">
              {t('settings.general')}
            </SettingsTabsTrigger>
            <SettingsTabsTrigger value="appearance">
              {t('settings.appearance')}
            </SettingsTabsTrigger>
          </SettingsTabsList>

          <div className="space-y-6">
            <TabsContent value="general" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">{t('settings.language')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.languageDescription')}
                  </p>
                </div>
                <Select
                  defaultValue={i18n.language || 'es'}
                  onValueChange={handleLanguageChange}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-900 border shadow-md">
                    <SelectItem 
                      value="es" 
                      className="cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-gray-100 dark:focus:bg-gray-800"
                    >
                      <span className="flex items-center">
                        <Globe className="w-4 h-4 mr-2" />
                        {t('languages.es')}
                      </span>
                    </SelectItem>
                    <SelectItem 
                      value="en"
                      className="cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-gray-100 dark:focus:bg-gray-800"
                    >
                      <span className="flex items-center">
                        <Globe className="w-4 h-4 mr-2" />
                        {t('languages.en')}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Mostrar hábitos completados</Label>
                  <p className="text-sm text-muted-foreground">
                    Muestra los hábitos que ya has completado en la lista
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={showCompletedHabits}
                    onCheckedChange={(checked) => setShowCompletedHabits(checked)}
                  />
                  <Eye className="h-4 w-4" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">{t('settings.theme')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.themeDescription')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4" />
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  />
                  <Moon className="h-4 w-4" />
                </div>
              </div>
            </TabsContent>

            <div className="space-y-2">
              <h3 className="text-lg font-medium">{t('settings.sortOptions.title')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('settings.sortOptions.description')}
              </p>
              <Select
                value={sortPreference}
                onValueChange={(value: 'time' | 'name') => setSortPreference(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="time">
                    {t('settings.sortOptions.byTime')}
                  </SelectItem>
                  <SelectItem value="name">
                    {t('settings.sortOptions.byName')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={onHelpClick} 
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <Flag className="w-4 h-4" />
                {t('settings.feedback')}
              </Button>
              <Button
                variant="default"
                onClick={() => onOpenChange?.(false)}
                className="flex items-center gap-2"
              >
                {t('settings.close')}
              </Button>
            </div>
          </div>
        </SettingsTabs>
      </DialogContent>
    </Dialog>
  );
}