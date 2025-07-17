import React, { useState, useEffect } from 'react'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/primitives/dialog";
import { Label } from "@/components/ui/primitives/label";
import { Input } from "@/components/ui/primitives/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/primitives/select";
import { Button } from "@/components/ui/primitives/button";
import { User } from "@/components/types/types";
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ChevronDown, Search } from "lucide-react";

// Lista de países más comunes
const COUNTRIES = [
  { code: 'AR', name: 'Argentina' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BR', name: 'Brasil' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CU', name: 'Cuba' },
  { code: 'DO', name: 'República Dominicana' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'ES', name: 'España' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'HN', name: 'Honduras' },
  { code: 'MX', name: 'México' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'PA', name: 'Panamá' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Perú' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'CA', name: 'Canadá' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'FR', name: 'Francia' },
  { code: 'DE', name: 'Alemania' },
  { code: 'IT', name: 'Italia' },
  { code: 'PT', name: 'Portugal' },
  { code: 'OTHER', name: 'Otro' }
];

interface UpdateProfileDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    name?: string;
    lastName?: string;
    email?: string;
    birthDate?: string;
    gender?: string;
    country?: string;
  };
  updateUserProfile: (data: any) => Promise<boolean>;
}

export const UpdateProfileDialog: React.FC<UpdateProfileDialogProps> = ({
  isOpen,
  onOpenChange,
  user = {
    name: '',
    lastName: '',
    email: '',
    birthDate: undefined,
    gender: undefined,
    country: undefined
  },
  updateUserProfile
}) => {
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

  // Estados para el selector de países
  const [countrySearchTerm, setCountrySearchTerm] = useState('');
  const [filteredCountries, setFilteredCountries] = useState(COUNTRIES);

  // Generar arrays para los selectores
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

  // Añadir un estado para controlar qué selector está abierto
  const [openSelector, setOpenSelector] = useState<'day' | 'month' | 'year' | 'country' | null>(null);

  // Filtrar países basado en el término de búsqueda
  useEffect(() => {
    if (countrySearchTerm) {
      const filtered = COUNTRIES.filter(country =>
        country.name.toLowerCase().includes(countrySearchTerm.toLowerCase())
      );
      setFilteredCountries(filtered);
    } else {
      setFilteredCountries(COUNTRIES);
    }
  }, [countrySearchTerm]);

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
      // Crear la fecha con la hora establecida a mediodía para evitar problemas de zona horaria
      const dateStr = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}T12:00:00.000Z`;
      const date = new Date(dateStr);
      
      // Verificar que la fecha sea válida
      if (!isNaN(date.getTime())) {
        setBirthDate(date);
        
        // Formatear la fecha como YYYY-MM-DD sin componente de tiempo
        const formattedDate = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`;
        setFormData(prev => ({
          ...prev,
          userBirthDate: formattedDate
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
        if (!target.closest('.date-selector') && !target.closest('.country-selector')) {
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
    
    // Crear un objeto con los datos del formulario
    const formValues = {
      userName: formData.userName,
      userLastName: formData.userLastName,
      // Formatear la fecha correctamente si existe
      userBirthDate: birthDate ? 
        `${birthDate.getFullYear()}-${String(birthDate.getMonth() + 1).padStart(2, '0')}-${String(birthDate.getDate()).padStart(2, '0')}` : 
        '',
      userGender: formData.userGender,
      userCountry: formData.userCountry
    };
    
    console.log("Enviando datos para actualización:", formValues);
    
    try {
      // Llamar a la función de actualización
      const success = await updateUserProfile(formValues);
      
      console.log("Resultado de la actualización:", success);
      
      if (success) {
        // Si la actualización fue exitosa, cerrar el diálogo
        console.log("Cerrando diálogo después de actualización exitosa");
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error al actualizar el perfil:", error);
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
          {value || t('profile.fields.day')}
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
          {value ? monthNames[parseInt(value) - 1] : t('profile.fields.month')}
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
          {value || t('profile.fields.year')}
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

  // Componente personalizado para el selector de países
  const CountrySelector = ({ value, onChange }: { value: string, onChange: (country: string) => void }) => {
    const selectedCountry = COUNTRIES.find(country => country.name === value);
    
    return (
      <div className="relative country-selector">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between text-left font-normal"
          onClick={() => setOpenSelector(openSelector === 'country' ? null : 'country')}
        >
          {selectedCountry ? selectedCountry.name : t('profile.fields.selectCountry', 'Seleccionar país')}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
        
        {openSelector === 'country' && (
          <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-[300px] overflow-y-auto">
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder={t('profile.fields.searchCountry', 'Buscar país...')}
                  value={countrySearchTerm}
                  onChange={(e) => setCountrySearchTerm(e.target.value)}
                  className="pl-10 text-sm"
                />
              </div>
            </div>
            <div className="p-1">
              {filteredCountries.map(country => (
                <div
                  key={country.code}
                  className={`px-2 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${
                    value === country.name ? 'bg-gray-100 dark:bg-gray-700' : ''
                  }`}
                  onClick={() => {
                    onChange(country.name);
                    setOpenSelector(null);
                    setCountrySearchTerm('');
                  }}
                >
                  {country.name}
                </div>
              ))}
              {filteredCountries.length === 0 && (
                <div className="px-2 py-1 text-gray-500 text-sm">
                  {t('profile.fields.noCountriesFound', 'No se encontraron países')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-[425px] bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-semibold mb-2">{t('profile.updateTitle')}</DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {t('profile.updateDescription')}
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
            
            {/* Selector de países mejorado */}
            <div>
              <Label htmlFor="userCountry" className="text-sm">{t('profile.fields.country')}</Label>
              <div className="mt-1">
                <CountrySelector 
                  value={formData.userCountry} 
                  onChange={(country) => setFormData({...formData, userCountry: country})}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-6">
            <Button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleSubmit(e as any);
              }}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
            >
              {t('profile.updateButton')}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              {t('buttons.cancel')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};