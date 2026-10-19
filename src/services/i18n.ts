export const languages = {
  es: {
    name: 'Español',
    translations: {
      'Inicio': 'Inicio',
      'Conductor': 'Conductor',
      'Cliente': 'Cliente',
      'Solicitar viaje': 'Solicitar viaje',
      'Configuración': 'Configuración',
      'Viajes en Vivo': 'Viajes en Vivo',
      'Viajes Ejecutivos': 'Viajes Ejecutivos',
      'Radio-Despacho': 'Radio-Despacho',
    }
  },
  qu: {
    name: 'Kichwa',
    translations: {
      'Inicio': 'Paktarishka',
      'Conductor': 'Antakuyukk',
      'Cliente': 'Kullkikuk',
      'Solicitar viaje': 'Paktana maskay',
      'Configuración': 'Allichina',
      'Viajes en Vivo': 'Kawsay Paktaykuna',
      'Viajes Ejecutivos': 'Hatun Paktaykuna',
      'Radio-Despacho': 'Radio-Willay',
    }
  }
};

export type LanguageCode = keyof typeof languages;

let currentLang: LanguageCode = 'es';

export const setLanguage = (lang: LanguageCode) => {
  currentLang = lang;
  localStorage.setItem('andesmovi_lang', lang);
};

export const getLanguage = (): LanguageCode => {
  return (localStorage.getItem('andesmovi_lang') as LanguageCode) || 'es';
};

export const t = (key: string): string => {
  const lang = getLanguage();
  return (languages[lang].translations as any)[key] || key;
};
