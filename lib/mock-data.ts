export type AnimalRecord = {
  id: string;
  name: string;
  type: 'Perro' | 'Gato' | 'Otro';
  breed: string;
  age_years: number;
  status: 'Disponible' | 'En tratamiento' | 'Adoptado' | 'Reservado';
  weight_kg: number;
  location: string;
  notes: string;
  sex: string;
  photo_webp?: string;
};

// Fotos reales en public/fotos/animales (créditos en CREDITOS.md de esa carpeta).
export const animals: AnimalRecord[] = [
  {
    id: 'luna',
    name: 'Luna',
    type: 'Perro',
    breed: 'Mestiza',
    age_years: 2,
    status: 'Disponible',
    weight_kg: 18.5,
    location: 'Área A / Sala 2',
    notes: 'Muy sociable y tranquila. Convive bien con otros perros y con niños. Esterilizada y con vacunas al día.',
    sex: 'Hembra',
    photo_webp: '/fotos/animales/luna.webp',
  },
  {
    id: 'milo',
    name: 'Milo',
    type: 'Gato',
    breed: 'Doméstico atigrado',
    age_years: 1,
    status: 'En tratamiento',
    weight_kg: 4.8,
    location: 'Área B / Sala 1',
    notes: 'Control de piel y revisión. Come bien y está muy activo; alta estimada en dos semanas.',
    sex: 'Macho',
    photo_webp: '/fotos/animales/milo.webp',
  },
  {
    id: 'nilo',
    name: 'Nilo',
    type: 'Perro',
    breed: 'Pastor alemán',
    age_years: 4,
    status: 'Disponible',
    weight_kg: 24,
    location: 'Área A / Sala 3',
    notes: 'Rescatado de la calle. Leal y protector; necesita ejercicio diario y una familia con experiencia. Esterilizado.',
    sex: 'Macho',
    photo_webp: '/fotos/animales/nilo.webp',
  },
  {
    id: 'kiko',
    name: 'Kiko',
    type: 'Gato',
    breed: 'Criollo',
    age_years: 3,
    status: 'Reservado',
    weight_kg: 5.4,
    location: 'Área B / Sala 2',
    notes: 'Muy cariñoso con niños. Adopción en proceso: entrevista aprobada, falta la visita domiciliaria.',
    sex: 'Macho',
    photo_webp: '/fotos/animales/kiko.webp',
  },
  {
    id: 'canela',
    name: 'Canela',
    type: 'Perro',
    breed: 'Cocker spaniel mestiza',
    age_years: 5,
    status: 'Disponible',
    weight_kg: 12,
    location: 'Área A / Sala 1',
    notes: 'Llegó tras el fallecimiento de su dueño. Cariñosa y tranquila, ideal para departamento. Requiere cepillado frecuente.',
    sex: 'Hembra',
    photo_webp: '/fotos/animales/canela.webp',
  },
  {
    id: 'toby',
    name: 'Toby',
    type: 'Perro',
    breed: 'Beagle',
    age_years: 3,
    status: 'Reservado',
    weight_kg: 11.5,
    location: 'Área A / Sala 4',
    notes: 'Juguetón y con gran olfato; necesita paseos largos. Adopción en proceso con una familia de Coyoacán.',
    sex: 'Macho',
    photo_webp: '/fotos/animales/toby.webp',
  },
  {
    id: 'rocky',
    name: 'Rocky',
    type: 'Perro',
    breed: 'Bulldog inglés',
    age_years: 6,
    status: 'En tratamiento',
    weight_kg: 23,
    location: 'Clínica / Recuperación',
    notes: 'En tratamiento por dermatitis en los pliegues de la piel. Dócil y glotón; evitar ejercicio intenso con calor.',
    sex: 'Macho',
    photo_webp: '/fotos/animales/rocky.webp',
  },
  {
    id: 'copito',
    name: 'Copito',
    type: 'Perro',
    breed: 'Mestizo (Shih tzu)',
    age_years: 7,
    status: 'Disponible',
    weight_kg: 6.5,
    location: 'Área C / Sala 1',
    notes: 'Pequeño y muy apegado a las personas. Ideal para adultos mayores. Pendiente limpieza dental.',
    sex: 'Macho',
    photo_webp: '/fotos/animales/copito.webp',
  },
  {
    id: 'miel',
    name: 'Miel',
    type: 'Perro',
    breed: 'Golden retriever mestiza',
    age_years: 0.4,
    status: 'Disponible',
    weight_kg: 9,
    location: 'Área C / Cachorros',
    notes: 'Cachorra de 5 meses rescatada con su camada. Primera vacuna aplicada; pendiente refuerzo y desparasitación.',
    sex: 'Hembra',
    photo_webp: '/fotos/animales/miel.webp',
  },
  {
    id: 'manchas',
    name: 'Manchas',
    type: 'Perro',
    breed: 'Dálmata',
    age_years: 3,
    status: 'Disponible',
    weight_kg: 25,
    location: 'Área A / Patio',
    notes: 'Mucha energía: le encanta correr y traer palos. Mejor en casa con jardín y familia activa.',
    sex: 'Macho',
    photo_webp: '/fotos/animales/manchas.webp',
  },
  {
    id: 'coco',
    name: 'Coco',
    type: 'Perro',
    breed: 'Mestizo (Poodle)',
    age_years: 2,
    status: 'Adoptado',
    weight_kg: 8,
    location: 'Hogar adoptivo',
    notes: 'Adoptado en septiembre. Seguimiento post-adopción: se adaptó muy bien a su nueva familia.',
    sex: 'Macho',
    photo_webp: '/fotos/animales/coco.webp',
  },
  {
    id: 'firulais',
    name: 'Firulais',
    type: 'Perro',
    breed: 'Mestizo',
    age_years: 4,
    status: 'Disponible',
    weight_kg: 17,
    location: 'Área B / Sala 3',
    notes: 'Rescatado de la calle con desnutrición; ya recuperó su peso. Algo tímido al principio, muy noble.',
    sex: 'Macho',
    photo_webp: '/fotos/animales/firulais.webp',
  },
  {
    id: 'bruno',
    name: 'Bruno',
    type: 'Perro',
    breed: 'Mestizo (Airedale terrier)',
    age_years: 5,
    status: 'Disponible',
    weight_kg: 21,
    location: 'Área A / Sala 5',
    notes: 'Inteligente y obediente: sabe sentarse y dar la pata. Se lleva bien con gatos.',
    sex: 'Macho',
    photo_webp: '/fotos/animales/bruno.webp',
  },
  {
    id: 'lola',
    name: 'Lola',
    type: 'Perro',
    breed: 'Beagle',
    age_years: 10,
    status: 'Disponible',
    weight_kg: 13,
    location: 'Área C / Sala 2',
    notes: 'Perrita senior muy tranquila. Toma suplemento para articulaciones. Busca un hogar para sus años dorados.',
    sex: 'Hembra',
    photo_webp: '/fotos/animales/lola.webp',
  },
  {
    id: 'nala',
    name: 'Nala',
    type: 'Gato',
    breed: 'Doméstico naranja y blanco',
    age_years: 2,
    status: 'Disponible',
    weight_kg: 3.8,
    location: 'Área B / Gatera 1',
    notes: 'Curiosa y ronroneadora. Esterilizada, vacunada y con prueba de leucemia felina negativa.',
    sex: 'Hembra',
    photo_webp: '/fotos/animales/nala.webp',
  },
  {
    id: 'simba',
    name: 'Simba',
    type: 'Gato',
    breed: 'Doméstico naranja',
    age_years: 0.3,
    status: 'Disponible',
    weight_kg: 1.2,
    location: 'Área B / Gatera 2',
    notes: 'Gatito rescatado a los 2 meses. Muy juguetón; se adaptaría mejor junto a otro gato.',
    sex: 'Macho',
    photo_webp: '/fotos/animales/simba.webp',
  },
  {
    id: 'bigotes',
    name: 'Bigotes',
    type: 'Gato',
    breed: 'Doméstico bicolor',
    age_years: 6,
    status: 'Disponible',
    weight_kg: 5.2,
    location: 'Área B / Gatera 3',
    notes: 'Perdió un ojo por una infección antes de llegar; ya está sano y usa prótesis ocular. Muy tranquilo.',
    sex: 'Macho',
    photo_webp: '/fotos/animales/bigotes.webp',
  },
  {
    id: 'humo',
    name: 'Humo',
    type: 'Gato',
    breed: 'Cartujo mestizo',
    age_years: 4,
    status: 'Reservado',
    weight_kg: 5.6,
    location: 'Área B / Gatera 1',
    notes: 'Tímido al inicio y muy cariñoso cuando toma confianza. Reservado por una pareja sin otras mascotas.',
    sex: 'Macho',
    photo_webp: '/fotos/animales/humo.webp',
  },
  {
    id: 'mia',
    name: 'Mía',
    type: 'Gato',
    breed: 'Doméstico atigrado',
    age_years: 3,
    status: 'En tratamiento',
    weight_kg: 3.4,
    location: 'Clínica / Recuperación',
    notes: 'Rescatada de la calle; en tratamiento antiparasitario. Muy sociable con personas y otros gatos.',
    sex: 'Hembra',
    photo_webp: '/fotos/animales/mia.webp',
  },
];

export const inventoryItems = [
  {
    id: 'inv-1',
    name: 'Croquetas Premium',
    category: 'Alimentos',
    stock: 75,
    min_stock: 30,
    expiry_date: '2026-11-12',
    unit: 'kg',
    status: 'Suficiente',
  },
  {
    id: 'inv-2',
    name: 'Vitaminas Caninos',
    category: 'Medicamentos',
    stock: 18,
    min_stock: 25,
    expiry_date: '2026-10-04',
    unit: 'caja',
    status: 'Bajo stock',
  },
  {
    id: 'inv-3',
    name: 'Gasas Esterilizadas',
    category: 'Material médico',
    stock: 32,
    min_stock: 20,
    expiry_date: '2026-09-29',
    unit: 'paquete',
    status: 'Por caducar',
  },
];

export const dashboardStats = [
  { label: 'Animales registrados', value: '248', change: '+12%', tone: 'bg-brand-primary' },
  { label: 'Adopciones del mes', value: '31', change: '+8%', tone: 'bg-brand-light' },
  { label: 'Alertas de inventario', value: '14', change: '-3%', tone: 'bg-amber-500' },
  { label: 'Donaciones recibidas', value: '$18,400', change: '+22%', tone: 'bg-emerald-500' },
];

export const monthlyAdoptions = [42, 58, 48, 72, 81, 66, 94, 88, 102];

export const speciesData = [
  { name: 'Perros', value: 44, color: '#0284c7' },
  { name: 'Gatos', value: 36, color: '#38bdf8' },
  { name: 'Otros', value: 20, color: '#0f172a' },
];

export const pendingRequests = [
  { name: 'Valeria R.', animal: 'Luna', date: 'Hace 2h' },
  { name: 'Carlos M.', animal: 'Nilo', date: 'Hace 4h' },
  { name: 'Elena T.', animal: 'Milo', date: 'Hace 7h' },
];

export const alerts = [
  'Antibiótico para cachorros por caducar en 12 días',
  'Vacuna de rabia pendiente para 5 animales',
  'Pellet para gatos con stock bajo',
];

export const adoptionLeads = [
  { id: 1, applicant: 'Valeria R.', animal: 'Luna', status: 'Preselección', source: 'Web', priority: 'Alta', score: 87, city: 'Roma Norte', assignee: 'Ana', lastContact: 'Hace 1h', home: 'Casa con patio', email: 'valeria.r@example.com' },
  { id: 2, applicant: 'Carlos M.', animal: 'Nilo', status: 'Entrevista', source: 'Instagram', priority: 'Media', score: 74, city: 'Coyoacán', assignee: 'Luis', lastContact: 'Hoy · 09:30', home: 'Departamento', email: 'carlos.m@example.com' },
  { id: 3, applicant: 'Elena T.', animal: 'Milo', status: 'Aprobado', source: 'Referido', priority: 'Alta', score: 92, city: 'Condesa', assignee: 'Paula', lastContact: 'Ayer', home: 'Casa con jardín', email: 'elena.t@example.com' },
  { id: 4, applicant: 'Javier S.', animal: 'Kiko', status: 'Pendiente', source: 'Facebook', priority: 'Baja', score: 68, city: 'Polanco', assignee: 'Ana', lastContact: 'Hace 3h', home: 'Departamento', email: 'javier.s@example.com' },
  { id: 5, applicant: 'María L.', animal: 'Luna', status: 'Documentación', source: 'Web', priority: 'Media', score: 80, city: 'Tepito', assignee: 'Luis', lastContact: 'Hace 6h', home: 'Casa', email: 'maria.l@example.com' },
];

export const financialSummary = [
  { label: 'Ingresos', value: '$48,500', tone: 'bg-emerald-500' },
  { label: 'Gastos', value: '$21,730', tone: 'bg-amber-500' },
  { label: 'Balance neto', value: '$26,770', tone: 'bg-sky-500' },
];

export const financialTransactions = [
  { id: 'ING-1042', type: 'ingreso', title: 'Fundación K9', category: 'Donación', amount: 2500, date: '2026-09-18', status: 'Cobrado' },
  { id: 'ING-1043', type: 'ingreso', title: 'Patricia Sol', category: 'Donante individual', amount: 800, date: '2026-09-19', status: 'Cobrado' },
  { id: 'ING-1044', type: 'ingreso', title: 'Paseo solidario', category: 'Evento', amount: 4200, date: '2026-09-20', status: 'Cobrado' },
  { id: 'GTO-2041', type: 'gasto', title: 'Vacunas', category: 'Salud', amount: 1400, date: '2026-09-21', status: 'Pagado' },
  { id: 'GTO-2042', type: 'gasto', title: 'Croquetas premium', category: 'Alimentos', amount: 1100, date: '2026-09-22', status: 'Pagado' },
  { id: 'GTO-2043', type: 'gasto', title: 'Limpieza y desinfección', category: 'Operación', amount: 890, date: '2026-09-23', status: 'Pagado' },
];

export const calendarEntries = [
  { id: 1, title: 'Cita de adopción', date: '2026-09-30', time: '10:00', type: 'Cita', assignee: 'Ana', status: 'Confirmada' },
  { id: 2, title: 'Visita veterinaria', date: '2026-09-30', time: '13:30', type: 'Salud', assignee: 'Luis', status: 'Programada' },
  { id: 3, title: 'Taller de adopción responsable', date: '2026-10-02', time: '18:00', type: 'Evento', assignee: 'Paula', status: 'Abierta' },
  { id: 4, title: 'Seguimiento de Luna', date: '2026-10-04', time: '11:15', type: 'Tarea', assignee: 'Ana', status: 'Pendiente' },
  { id: 5, title: 'Revisión de inventario', date: '2026-10-05', time: '09:00', type: 'Tarea', assignee: 'Luis', status: 'Pendiente' },
];

export const taskQueue = [
  { title: 'Confirmar entrevista con Carlos M.', due: 'Hoy · 15:00', owner: 'Luis' },
  { title: 'Preparar expediente de María L.', due: 'Mañana · 09:30', owner: 'Ana' },
  { title: 'Actualizar stock de medicamentos', due: 'Miércoles · 12:00', owner: 'Paula' },
];

export const userProfiles = [
  { id: 1, name: 'Ana Morales', role: 'admin', email: 'admin@huellitas.org', team: 'Dirección', status: 'Activo', location: 'CDMX', permissions: ['Dashboard', 'Adopciones', 'Finanzas', 'Usuarios'] },
  { id: 2, name: 'Luis Ortega', role: 'operador', email: 'operador@huellitas.org', team: 'Cuidado', status: 'Activo', location: 'Azcapotzalco', permissions: ['Animales', 'Inventario', 'Seguimiento'] },
  { id: 3, name: 'Paula Ruiz', role: 'voluntario', email: 'voluntario@huellitas.org', team: 'Voluntariado', status: 'En línea', location: 'Roma Norte', permissions: ['Eventos', 'Turnos', 'Reportes'] },
  { id: 4, name: 'Diego Navarro', role: 'operador', email: 'diego@huellitas.org', team: 'Adopciones', status: 'Activo', location: 'Tlalpan', permissions: ['CRM', 'Entrevistas', 'Documentación'] },
];

export const volunteerTeams = [
  { name: 'Paseo y socialización', members: 12, nextShift: 'Hoy · 17:30', occupancy: 86 },
  { name: 'Adopciones y entrevistas', members: 7, nextShift: 'Mañana · 10:00', occupancy: 71 },
  { name: 'Cuidado veterinario', members: 5, nextShift: 'Jueves · 09:00', occupancy: 64 },
];

export const fundraisingCampaigns = [
  { name: 'Paseos solidarios', goal: '$12,000', raised: '$9,400', progress: 78 },
  { name: 'Vacunas de septiembre', goal: '$8,500', raised: '$6,650', progress: 78 },
  { name: 'Kit de adopción', goal: '$4,800', raised: '$3,120', progress: 65 },
];

export const eventCalendar = [
  { title: 'Jornada de esterilización', date: '27 Sep', type: 'Salud', time: '09:00 - 15:00' },
  { title: 'Taller de adopción responsable', date: '02 Oct', type: 'Comunidad', time: '18:00 - 20:00' },
  { title: 'Paseo de perros con patrocinio', date: '05 Oct', type: 'Voluntariado', time: '08:30 - 12:00' },
  { title: 'Cierre de campaña de donaciones', date: '10 Oct', type: 'Fundraising', time: '10:00 - 13:00' },
];

export const adoptionRequests = [
  { id: 1, applicant: 'Valeria R.', phone: '555 123 456', occupation: 'Diseñadora', home: 'Departamento', animal: 'Luna', status: 'Pendiente' },
  { id: 2, applicant: 'Carlos M.', phone: '555 321 987', occupation: 'Ingeniero', home: 'Casa', animal: 'Nilo', status: 'Entrevista' },
  { id: 3, applicant: 'Elena T.', phone: '555 673 121', occupation: 'Docente', home: 'Casa con patio', animal: 'Milo', status: 'Aprobado' },
];

export const adoptionListings = [
  { id: 1, name: 'Nora', pet: 'Milo', location: 'Coyoacán', motive: 'Necesita espacio para correr' },
  { id: 2, name: 'Rafael', pet: 'Luna', location: 'Roma Norte', motive: 'Se va a mudar y busca hogar responsable' },
  { id: 3, name: 'María', pet: 'Kiko', location: 'Condesa', motive: 'Se requiere trato con niños' },
];

export const reports = [
  { id: 1, type: 'Maltrato', priority: 'Alta', date: 'Hace 2h', status: 'Pendiente' },
  { id: 2, type: 'Animal abandonado', priority: 'Media', date: 'Ayer', status: 'Aprobado' },
  { id: 3, type: 'Herido', priority: 'Alta', date: 'Hoy', status: 'Atendido' },
];

export const summary = [
  { label: 'Total de ingresos', value: '$84,500', accent: 'bg-brand-primary' },
  { label: 'Total de gastos', value: '$31,200', accent: 'bg-brand-light' },
  { label: 'Balance neto', value: '$53,300', accent: 'bg-emerald-500' },
];

export const donations = [
  { donor: 'Fundación K9', amount: '$2,500', date: '08/09/2026', proof: 'Factura A-102' },
  { donor: 'Patricia Sol', amount: '$800', date: '09/09/2026', proof: 'Transferencia' },
  { donor: 'Comedor Mi Casita', amount: '$1,200', date: '11/09/2026', proof: 'Efectivo' },
];

export const expenses = [
  { concept: 'Vacunas', category: 'Salud', amount: '$1,400', date: '10/09/2026' },
  { concept: 'Comida para perros', category: 'Alimentos', amount: '$1,100', date: '12/09/2026' },
  { concept: 'Limpieza', category: 'Operación', amount: '$890', date: '15/09/2026' },
];

export function getAnimalById(id: string) {
  return animals.find((animal) => animal.id === id) ?? null;
}
