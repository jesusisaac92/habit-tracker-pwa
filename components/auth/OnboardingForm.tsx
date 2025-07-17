import React, { useState } from 'react';
import { supabase } from '@/src/supabase/config/client';
import { useTranslation } from 'react-i18next';

export const OnboardingForm = ({ user, onComplete }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    birthDate: '',
    gender: '',
    country: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      console.log("Actualizando perfil para usuario:", user.id);
      
      // Primero verificamos si el perfil ya existe
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error("Error al verificar perfil existente:", fetchError);
        throw fetchError;
      }
      
      const now = new Date().toISOString();
      
      const profileData = {
        name: formData.name,
        last_name: formData.lastName,
        birth_date: formData.birthDate || null,
        gender: formData.gender || null,
        country: formData.country || null,
        avatar_url: 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y',
        created_at: now,
        updated_at: now
      };
      
      console.log("Datos a actualizar:", profileData);
      
      let result;
      
      if (existingProfile) {
        console.log("Actualizando perfil existente");
        // Para actualización, no incluimos created_at
        const { created_at, ...updateData } = profileData;
        result = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', user.id);
      } else {
        console.log("Creando nuevo perfil");
        result = await supabase
          .from('profiles')
          .insert([{
            id: user.id,
            ...profileData
          }]);
      }
      
      if (result.error) {
        console.error("Error en operación de base de datos:", result.error);
        throw result.error;
      }
      
      console.log("Perfil actualizado correctamente");
      
      // Esperar un momento antes de recargar
      setTimeout(() => {
        onComplete();
      }, 500);
      
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const genderOptions = [
    { value: "male", label: t('profile.gender.male') },
    { value: "female", label: t('profile.gender.female') },
    { value: "preferNotToSay", label: t('profile.gender.preferNotToSay') }
  ];
  
  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">{t('onboarding.title')}</h2>
      <p className="mb-6 text-gray-600">{t('onboarding.description')}</p>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('profile.name')}</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('profile.lastName')}</label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('profile.fields.birthDate')}</label>
          <input
            type="date"
            value={formData.birthDate}
            onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('profile.gender.label')}</label>
          <select
            value={formData.gender}
            onChange={(e) => setFormData({...formData, gender: e.target.value})}
            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
          >
            <option value="">{t('profile.gender.select')}</option>
            {genderOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('profile.fields.country')}</label>
          <input
            type="text"
            value={formData.country}
            onChange={(e) => setFormData({...formData, country: e.target.value})}
            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 px-4 text-white rounded-md ${loading ? 'bg-gray-500' : 'bg-black hover:bg-gray-800'}`}
        >
          {loading ? t('common.loading', 'Cargando...') : t('onboarding.complete')}
        </button>
      </form>
    </div>
  );
}; 