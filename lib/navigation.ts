import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  ClipboardList,
  Columns3,
  DollarSign,
  HandCoins,
  Handshake,
  Heart,
  Home,
  LayoutDashboard,
  Package,
  PartyPopper,
  PawPrint,
  Plus,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { canAccessPath, type AppRole } from '@/lib/auth/roles';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Tecla que, tras pulsar «G», abre la sección (p. ej. G + A). */
  shortcut?: string;
  keywords?: string;
};

export type NavSection = { title: string; items: NavItem[] };

export const navSections: NavSection[] = [
  {
    title: 'General',
    items: [{ label: 'Dashboard', href: '/', icon: LayoutDashboard, shortcut: 'D', keywords: 'inicio resumen panel' }],
  },
  {
    title: 'Refugio',
    items: [
      { label: 'Expedientes', href: '/animales', icon: PawPrint, shortcut: 'A', keywords: 'animales perros gatos' },
      { label: 'Seguimiento', href: '/animales/seguimiento', icon: ClipboardList, shortcut: 'B', keywords: 'bienestar recordatorios' },
      { label: 'Inventario', href: '/inventario', icon: Package, shortcut: 'I', keywords: 'stock insumos alimento medicinas' },
      { label: 'Agenda', href: '/agenda', icon: CalendarDays, shortcut: 'C', keywords: 'citas calendario tareas' },
    ],
  },
  {
    title: 'Adopciones',
    items: [
      { label: 'Solicitudes', href: '/adopciones', icon: Heart, shortcut: 'S', keywords: 'adoptantes' },
      { label: 'Tablero', href: '/adopciones/solicitudes', icon: Columns3, shortcut: 'T', keywords: 'kanban etapas' },
      { label: 'Particulares', href: '/adopciones/particulares', icon: Home, keywords: 'publicaciones' },
    ],
  },
  {
    title: 'Comunidad',
    items: [
      { label: 'Voluntariado', href: '/voluntariado', icon: Handshake, shortcut: 'V', keywords: 'turnos equipos' },
      { label: 'Eventos', href: '/eventos', icon: PartyPopper, shortcut: 'E', keywords: 'ferias campañas' },
      { label: 'Donaciones', href: '/donaciones', icon: DollarSign, shortcut: 'F', keywords: 'finanzas dinero ingresos gastos' },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { label: 'Reportes', href: '/reportes', icon: BarChart3, shortcut: 'R', keywords: 'ciudadanos denuncias' },
      { label: 'Alertas', href: '/reportes/alertas', icon: AlertTriangle, keywords: 'avisos urgentes' },
      { label: 'Usuarios', href: '/usuarios', icon: Users, shortcut: 'U', keywords: 'equipo roles permisos' },
    ],
  },
];

export const quickActions: NavItem[] = [
  { label: 'Registrar animal', href: '/animales?nuevo=1', icon: Plus, keywords: 'nuevo ingreso alta perro gato' },
  { label: 'Nueva solicitud de adopción', href: '/adopciones?nuevo=1', icon: Heart, keywords: 'adoptante crear' },
  { label: 'Registrar donación o gasto', href: '/donaciones?nuevo=1', icon: HandCoins, keywords: 'ingreso movimiento dinero' },
  { label: 'Agregar insumo', href: '/inventario?nuevo=1', icon: Package, keywords: 'inventario alimento medicina' },
];

const allHrefs = navSections.flatMap((section) => section.items.map((item) => item.href));

export function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  if (pathname !== href && !pathname.startsWith(`${href}/`)) return false;
  // Si hay un enlace más específico que también coincide (p. ej. /animales/seguimiento), ese gana.
  return !allHrefs.some((other) => other.length > href.length && (pathname === other || pathname.startsWith(`${other}/`)));
}

export function visibleSections(role: AppRole): NavSection[] {
  return navSections
    .map((section) => ({ ...section, items: section.items.filter((item) => canAccessPath(role, item.href)) }))
    .filter((section) => section.items.length > 0);
}

export function visibleQuickActions(role: AppRole): NavItem[] {
  return quickActions.filter((item) => canAccessPath(role, item.href.split('?')[0]));
}

/** Quita acentos y pasa a minúsculas para búsquedas tolerantes («médico» = «medico»). */
export function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
