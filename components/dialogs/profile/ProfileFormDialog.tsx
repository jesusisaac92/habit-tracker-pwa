import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/primitives/dialog";
import { Label } from "@/components/ui/primitives/label";
import { Input } from "@/components/ui/primitives/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/primitives/select";
import { Button } from "@/components/ui/primitives/button";
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ChevronDown } from "lucide-react";
import { supabase } from "@/src/supabase/config/client";

interface ProfileFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  mode: 'update' | 'onboarding';
  user: {
    name?: string;
    lastName?: string;
    email?: string;
    birthDate?: string;
    gender?: string;
    country?: string;
    id?: string;
  };
  updateUserProfile: (data: any) => Promise<boolean>;
}

export function ProfileFormDialog({ isOpen, onOpenChange, onSubmit, mode, user, updateUserProfile }: ProfileFormDialogProps) {
  const { t, i18n } = useTranslation()
  
  const [formData, setFormData] = useState({
    userName: user.name || '',
    userLastName: user.lastName || '',
    userBirthDate: user.birthDate || '',
    userGender: user.gender || '',
    userCountry: user.country || ''
  });
  
  // Estados para el selector de fecha
  const [birthDay, setBirthDay] = useState<string>('');
  const [birthMonth, setBirthMonth] = useState<string>('');
  const [birthYear, setBirthYear] = useState<string>('');
  
  const [birthDate, setBirthDate] = useState<Date | undefined>(
    user.birthDate ? new Date(user.birthDate) : undefined
  );

  // Generar arrays para los selectores
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

  // Añadir un estado para controlar qué selector está abierto
  const [openSelector, setOpenSelector] = useState<'day' | 'month' | 'year' | null>(null);

  // Inicializar los selectores con la fecha actual si existe
  useEffect(() => {
    if (isOpen) {
      setFormData({
        userName: user.name || '',
        userLastName: user.lastName || '',
        userBirthDate: user.birthDate || '',
        userGender: user.gender || '',
        userCountry: user.country || ''
      });
      
      if (user.birthDate) {
        const date = new Date(user.birthDate);
        setBirthDate(date);
        setBirthDay(date.getDate().toString().padStart(2, '0'));
        setBirthMonth((date.getMonth() + 1).toString().padStart(2, '0'));
        setBirthYear(date.getFullYear().toString());
      } else {
        setBirthDate(undefined);
        setBirthDay('');
        setBirthMonth('');
        setBirthYear('');
      }
    }
  }, [isOpen, user]);

  // Actualizar la fecha cuando cambian los selectores
  useEffect(() => {
    if (birthDay && birthMonth && birthYear) {
      const dateStr = `${birthYear}-${birthMonth}-${birthDay}`;
      const date = new Date(dateStr);
      
      // Verificar que la fecha sea válida
      if (!isNaN(date.getTime())) {
        setBirthDate(date);
        setFormData(prev => ({
          ...prev,
          userBirthDate: dateStr
        }));
      }
    } else {
      setBirthDate(undefined);
    }
  }, [birthDay, birthMonth, birthYear]);

  // Añadir un efecto para cerrar los selectores cuando se hace clic fuera de ellos
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openSelector !== null) {
        // Verificar si el clic fue fuera de los selectores
        const target = event.target as HTMLElement;
        if (!target.closest('.date-selector')) {
          setOpenSelector(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openSelector]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Llamar a handleManualSubmit para unificar la lógica
    await handleManualSubmit();
  };

  const handleManualSubmit = async () => {
    console.log("Enviando datos manualmente");
    
    if (!formData.userName || !formData.userLastName) {
      console.error("Faltan campos requeridos");
      alert("Por favor completa todos los campos requeridos");
      return;
    }
    
    // Actualizar el perfil directamente desde aquí
    if (user && user.id) {
      try {
        console.log("Enviando datos a Supabase...");
        
        // Crear objeto con los datos actualizados usando los nombres de columna correctos
        const updatedProfile = {
          id: user.id,
          name: formData.userName,
          last_name: formData.userLastName,
          birth_date: birthDate ? format(birthDate, 'yyyy-MM-dd') : null,
          gender: formData.userGender,
          country: formData.userCountry,
          updated_at: new Date().toISOString()
        };
        
        console.log("Datos a enviar:", updatedProfile);
        
        // Usar la función proporcionada por las props en lugar de llamar directamente a Supabase
        const success = await updateUserProfile(updatedProfile);
        
        if (success) {
          console.log("Perfil actualizado correctamente");
          alert("Perfil actualizado correctamente");
          
          // Cerrar el diálogo en lugar de redirigir
          onOpenChange(false);
          
          // Opcional: Recargar los datos del usuario sin recargar la página
          // Si tienes una función para esto, llámala aquí
        } else {
          console.error("Error al actualizar el perfil");
          alert("Error al actualizar el perfil. Por favor intenta de nuevo.");
        }
      } catch (err) {
        console.error("Error en la petición:", err);
        alert("Error en la petición: " + (err as Error).message);
      }
    } else {
      console.error("No hay ID de usuario");
      alert("No se pudo identificar al usuario");
    }
  };

  const genderOptions = [
    { value: "male", label: t('profile.gender.male') },
    { value: "female", label: t('profile.gender.female') },
    { value: "preferNotToSay", label: t('profile.gender.preferNotToSay') }
  ];

  // Nombres de los meses para mostrar en el selector
  const monthNames = [
    t('calendar.months.enero'),
    t('calendar.months.febrero'),
    t('calendar.months.marzo'),
    t('calendar.months.abril'),
    t('calendar.months.mayo'),
    t('calendar.months.junio'),
    t('calendar.months.julio'),
    t('calendar.months.agosto'),
    t('calendar.months.septiembre'),
    t('calendar.months.octubre'),
    t('calendar.months.noviembre'),
    t('calendar.months.diciembre')
  ];

  // Textos traducidos para los selectores de fecha
  const dayText = t('profile.fields.day') || 'Día';
  const monthText = t('profile.fields.month') || 'Mes';
  const yearText = t('profile.fields.year') || 'Año';

  // Componente personalizado para el selector de días
  const DaySelector = ({ value, onChange }: { value: string, onChange: (day: string) => void }) => {
    const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    
    return (
      <div className="relative date-selector">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between text-left font-normal"
          onClick={() => setOpenSelector(openSelector === 'day' ? null : 'day')}
        >
          {value || dayText}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
        
        {openSelector === 'day' && (
          <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-[200px] overflow-y-auto">
            <div className="p-1">
              {days.map(day => (
                <div
                  key={day}
                  className={`px-2 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${
                    value === day ? 'bg-gray-100 dark:bg-gray-700' : ''
                  }`}
                  onClick={() => {
                    onChange(day);
                    setOpenSelector(null);
                  }}
                >
                  {day}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Crear componentes personalizados para mes y año similar al de día
  const MonthSelector = ({ value, onChange }: { value: string, onChange: (month: string) => void }) => {
    return (
      <div className="relative date-selector">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between text-left font-normal"
          onClick={() => setOpenSelector(openSelector === 'month' ? null : 'month')}
        >
          {value ? monthNames[parseInt(value) - 1] : monthText}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
        
        {openSelector === 'month' && (
          <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-[200px] overflow-y-auto">
            <div className="p-1">
              {months.map((month, index) => (
                <div
                  key={month}
                  className={`px-2 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${
                    value === month ? 'bg-gray-100 dark:bg-gray-700' : ''
                  }`}
                  onClick={() => {
                    onChange(month);
                    setOpenSelector(null);
                  }}
                >
                  {monthNames[index]}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const YearSelector = ({ value, onChange }: { value: string, onChange: (year: string) => void }) => {
    return (
      <div className="relative date-selector">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between text-left font-normal"
          onClick={() => setOpenSelector(openSelector === 'year' ? null : 'year')}
        >
          {value || yearText}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
        
        {openSelector === 'year' && (
          <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-[200px] overflow-y-auto">
            <div className="p-1">
              {years.map(year => (
                <div
                  key={year}
                  className={`px-2 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${
                    value === year ? 'bg-gray-100 dark:bg-gray-700' : ''
                  }`}
                  onClick={() => {
                    onChange(year);
                    setOpenSelector(null);
                  }}
                >
                  {year}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Asegúrate de que la fecha se formatee correctamente para el input date
  const formatDateForInput = (dateString: string | undefined) => {
    if (!dateString) return '';
    
    // Convertir a formato YYYY-MM-DD para el input date
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch (e) {
      console.error('Error formateando fecha:', e);
      return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-[425px] bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-semibold mb-2">
            {mode === 'onboarding' ? t('profile.createTitle') : t('profile.updateTitle')}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {mode === 'onboarding' ? t('profile.createDescription') : t('profile.updateDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="userName" className="text-sm">{t('profile.name')}</Label>
              <Input 
                id="userName" 
                name="userName" 
                value={formData.userName}
                onChange={(e) => setFormData({...formData, userName: e.target.value})}
                required 
                className="mt-1 text-sm" 
              />
            </div>
            <div>
              <Label htmlFor="userLastName" className="text-sm">{t('profile.lastName')}</Label>
              <Input 
                id="userLastName" 
                name="userLastName" 
                value={formData.userLastName}
                onChange={(e) => setFormData({...formData, userLastName: e.target.value})}
                required 
                className="mt-1 text-sm" 
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="userEmail" className="text-sm">{t('profile.email')}</Label>
              <Input id="userEmail" name="userEmail" type="email" defaultValue={user.email} required className="mt-1 text-sm" />
            </div>
            
            {/* Selector de fecha con dropdowns personalizados */}
            <div className="sm:col-span-2">
              <Label className="text-sm mb-2 block">{t('profile.fields.birthDate')}</Label>
              <div className="grid grid-cols-3 gap-2">
                {/* Selector de día */}
                <div>
                  <DaySelector value={birthDay} onChange={setBirthDay} />
                </div>
                
                {/* Selector de mes */}
                <div>
                  <MonthSelector value={birthMonth} onChange={setBirthMonth} />
                </div>
                
                {/* Selector de año */}
                <div>
                  <YearSelector value={birthYear} onChange={setBirthYear} />
                </div>
              </div>
              
              {/* Campo oculto para el valor de la fecha */}
              <input 
                type="hidden" 
                name="userBirthDate" 
                value={birthDate ? format(birthDate, 'yyyy-MM-dd') : ''} 
              />
            </div>
            
            <div>
              <Label htmlFor="userGender" className="text-sm">
                {t('profile.gender.label')}
              </Label>
              <Select 
                name="userGender" 
                value={formData.userGender}
                onValueChange={(value) => setFormData({...formData, userGender: value})}
              >
                <SelectTrigger className="mt-1 text-sm">
                  <SelectValue placeholder={t('profile.gender.select')} />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg">
                  {genderOptions.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      className="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer py-2 px-4 text-sm"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="userCountry" className="text-sm">{t('profile.fields.country')}</Label>
              <Input 
                id="userCountry" 
                name="userCountry" 
                value={formData.userCountry}
                onChange={(e) => setFormData({...formData, userCountry: e.target.value})}
                className="mt-1 text-sm" 
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-6">
            <Button 
              type="button"
              className="w-full px-4 py-2 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
              onClick={handleManualSubmit}
            >
              {mode === 'onboarding' ? t('profile.createButton') : t('profile.updateButton')}
            </Button>
            {mode === 'update' && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="w-full"
              >
                {t('buttons.cancel')}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 