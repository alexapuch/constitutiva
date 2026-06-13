export const CONSTANCIA_PDF_PREFIX: Record<string, string> = {
  'completa':                'CONSTANCIAS',
  'evacuacion':              'CONSTANCIA EVA',
  'extintores':              'CONSTANCIA UYME',
  'primeros_auxilios':       'CONSTANCIA P.A.',
  'pa_extintores':           'CONSTANCIA P.A.-UYME',
  'completa_tulum':          'CONSTANCIAS',
  'evacuacion_tulum':        'CONSTANCIA EVA',
  'extintores_tulum':        'CONSTANCIA UYME',
  'primeros_auxilios_tulum': 'CONSTANCIA P.A.',
  'pa_extintores_tulum':     'CONSTANCIA P.A.-UYME',
};

export const CONSTANCIA_TYPES = [
  { id: 'completa',           label: 'Completa (todos los rubros)',    image: '/constancia_vacia.png',                  location: 'pdc' },
  { id: 'evacuacion',         label: 'Evacuación',                     image: '/constancia_evacuacion.png',             location: 'pdc' },
  { id: 'extintores',         label: 'Uso y Manejo de Extintores',     image: '/constancia_extintores.png',             location: 'pdc' },
  { id: 'primeros_auxilios',  label: 'Primeros Auxilios',              image: '/constancia_primeros_auxilios.png',      location: 'pdc' },
  { id: 'pa_extintores',      label: 'Primeros Auxilios + Extintores', image: '/constancia_pa_extintores.png',          location: 'pdc' },
  { id: 'completa_tulum',          label: 'Completa (todos los rubros)',    image: '/constancia_vacia_tulum.png',             location: 'tulum' },
  { id: 'evacuacion_tulum',        label: 'Evacuación',                     image: '/constancia_evacuacion_tulum.png',        location: 'tulum' },
  { id: 'extintores_tulum',        label: 'Uso y Manejo de Extintores',     image: '/constancias_extintores_tulum.png',       location: 'tulum' },
  { id: 'primeros_auxilios_tulum', label: 'Primeros Auxilios',              image: '/constancia_primeros_auxilios_tulum.png', location: 'tulum' },
  { id: 'pa_extintores_tulum',     label: 'Primeros Auxilios + Extintores', image: '/constancia_pa_extintores_tulum.png',     location: 'tulum' },
];
