import React, { Dispatch, SetStateAction } from 'react';
import { Button } from "@/components/ui/primitives/button";
import { Menu, ChevronDown } from "lucide-react";
import { useTranslation } from 'next-i18next';
import type { i18n } from 'i18next';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/primitives/card";
import { Label } from "@/components/ui/primitives/label";
import { Switch } from "@/components/ui/primitives/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/primitives/select";
// Commented for production - Theme functionality needs more work
// import { Sun, Moon } from "lucide-react";
import { useToast } from "@/components/ui/providers/toast/use-toast";
import { useTimeFormat } from '@/components/ui/composite/common/useTimeFormat';
import { changeLanguage } from '@/components/ui/config/i18n';

interface SettingsTabProps {
  i18n: i18n;
  // Commented for production - Theme functionality needs more work
  // theme: string | undefined;
  // setTheme: (theme: string) => void;
  showMoreSettings: boolean;
  setShowMoreSettings: (show: boolean) => void;
  sortPreference: string;
  setSortPreference: Dispatch<SetStateAction<SortOption>>;
  showCompletedHabits: boolean;
  setShowCompletedHabits: (show: boolean) => void;
  // Commented for production - only used in development mode
  // blockFutureDates: boolean;
  // setBlockFutureDates: (block: boolean) => void;
}

type SortOption = 'time' | 'name' | 'creationDate';

export const SettingsTab = ({
  i18n,
  // Commented for production - Theme functionality needs more work
  // theme,
  // setTheme,
  showMoreSettings,
  setShowMoreSettings,
  sortPreference,
  setSortPreference,
  showCompletedHabits,
  setShowCompletedHabits,
  // Commented for production - only used in development mode
  // blockFutureDates,
  // setBlockFutureDates
}: SettingsTabProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { use24HourFormat, setUse24HourFormat } = useTimeFormat();

  const onLanguageChange = async (value: string) => {
    try {
      await changeLanguage(value);
      toast({
        title: t('settings.languageChanged'),
        description: t('settings.languageChangedDescription'),
      });
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="max-w-2xl mx-auto bg-white dark:bg-gray-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">{t('settings.general')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Sección de Idioma */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-base font-semibold">{t('settings.language')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settings.languageDescription')}
              </p>
            </div>
            <Select
              defaultValue={i18n?.language ?? 'es'}
              onValueChange={onLanguageChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-[300px] bg-gray-50 dark:bg-gray-800/90">
                <SelectItem value="es">{t('languages.es')}</SelectItem>
                <SelectItem value="en">{t('languages.en')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sección de Formato de Hora */}
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex-1 space-y-1">
                <div className="text-sm font-medium">
                  {t('settings.timeFormat.title')}
                </div>
                <p className="text-xs text-muted-foreground pr-4">
                  {t('settings.timeFormat.description')}
                </p>
              </div>
              <Switch
                checked={!use24HourFormat}
                onCheckedChange={(checked) => setUse24HourFormat(!checked)}
                className="data-[state=checked]:bg-black data-[state=unchecked]:bg-gray-200 
                  dark:data-[state=unchecked]:bg-gray-600 
                  dark:data-[state=checked]:bg-gradient-to-br dark:data-[state=checked]:from-emerald-400 dark:data-[state=checked]:to-cyan-400 
                  dark:hover:data-[state=unchecked]:bg-gray-500"
              />
            </div>
          </div>

          {/* Commented for production - Theme functionality needs more work
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-base font-semibold">
                {t('settings.theme.title')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('settings.themeDescription')}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center space-x-4">
                {theme === "dark" ? (
                  <Moon className="h-5 w-5 text-primary" />
                ) : (
                  <Sun className="h-5 w-5 text-primary" />
                )}
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">
                    {theme === "dark" 
                      ? t('settings.theme.darkMode') 
                      : t('settings.theme.lightMode')
                    }
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {theme === "dark" 
                      ? (
                        <>
                          {t('settings.theme.darkDescription.line1')}<br />
                          {t('settings.theme.darkDescription.line2')}
                        </>
                      ) 
                      : (
                        <>
                          {t('settings.theme.lightDescription.line1')}<br />
                          {t('settings.theme.lightDescription.line2')}
                        </>
                      )
                    }
                  </div>
                </div>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                className="data-[state=checked]:bg-black data-[state=unchecked]:bg-gray-200 
                  dark:data-[state=unchecked]:bg-gray-600 
                  dark:data-[state=checked]:bg-gradient-to-br dark:data-[state=checked]:from-emerald-400 dark:data-[state=checked]:to-cyan-400 
                  dark:hover:data-[state=unchecked]:bg-gray-500"
              />
            </div>
          </div>
          */}

          {/* Botón de Más Configuración */}
          <div className="pt-4">
            <Button
              onClick={() => setShowMoreSettings(!showMoreSettings)}
              variant="outline"
              className="w-full flex items-center justify-between"
            >
              <span>{t('settings.moreSettings.title')}</span>
              <ChevronDown 
                className={`w-4 h-4 transition-transform ${
                  showMoreSettings ? 'transform rotate-180' : ''
                }`}
              />
            </Button>
          </div>

          {/* Configuración adicional */}
          {showMoreSettings && (
            <div className="space-y-4 pt-6 border-t">
              {/* ... resto de la configuración ... */}
              <div className="space-y-1.5">
                <Label className="text-xl font-semibold">
                  {t('settings.habitList.title')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('settings.habitList.description')}
                </p>
              </div>

              {/* Selector de ordenamiento */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-base font-semibold">
                    {t('settings.habitList.sortOptions.title')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.habitList.sortOptions.description')}
                  </p>
                </div>
                <Select
                  value={sortPreference}
                  onValueChange={(value: 'time' | 'name' | 'creationDate') => setSortPreference(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="min-w-[300px] bg-gray-50 dark:bg-gray-800/90">
                    <SelectItem value="time">
                      {t('settings.habitList.sortOptions.byTime')}
                    </SelectItem>
                    <SelectItem value="name">
                      {t('settings.habitList.sortOptions.byName')}
                    </SelectItem>
                    <SelectItem value="creationDate">
                      {t('settings.habitList.sortOptions.byCreationDate')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Control de visualización de hábitos completados */}
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex-1 space-y-1">
                    <div className="text-sm font-medium">
                      {t('settings.habitList.showCompleted')}
                    </div>
                    <p className="text-xs text-muted-foreground pr-4">
                      {t('settings.habitList.showCompletedDescription')}
                    </p>
                  </div>
                  <div className="flex items-center pl-4">
                    <Switch
                      checked={showCompletedHabits}
                      onCheckedChange={setShowCompletedHabits}
                      className="data-[state=checked]:bg-black data-[state=unchecked]:bg-gray-200 
                        dark:data-[state=unchecked]:bg-gray-600 
                        dark:data-[state=checked]:bg-gradient-to-br dark:data-[state=checked]:from-emerald-400 dark:data-[state=checked]:to-cyan-400 
                        dark:hover:data-[state=unchecked]:bg-gray-500"
                    />
                  </div>
                </div>
              </div>

              {/* Commented for production - only used in development mode
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex-1 space-y-1">
                  <div className="text-sm font-medium">
                    {t('settings.unlockFutureDates')}
                  </div>
                  <p className="text-xs text-muted-foreground pr-4">
                    {t('settings.unlockFutureDatesDescription')}
                  </p>
                </div>
                <Switch
                  checked={!blockFutureDates}
                  onCheckedChange={(checked) => setBlockFutureDates(!checked)}
                  className="data-[state=checked]:bg-black data-[state=unchecked]:bg-gray-200 
                        dark:data-[state=unchecked]:bg-gray-600 
                        dark:data-[state=checked]:bg-gradient-to-br dark:data-[state=checked]:from-emerald-400 dark:data-[state=checked]:to-cyan-400 
                        dark:hover:data-[state=unchecked]:bg-gray-500"
                />
              </div>
              */}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 