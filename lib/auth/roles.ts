export type AppRole = 'admin' | 'operador' | 'voluntario';

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  avatarPath?: string | null;
};

export const ALL_ROLES: AppRole[] = ['admin', 'operador', 'voluntario'];
export const STAFF_ROLES: AppRole[] = ['admin', 'operador'];

export function isAppRole(role: unknown): role is AppRole {
  return role === 'admin' || role === 'operador' || role === 'voluntario';
}

export function getRoleLabel(role: AppRole) {
  switch (role) {
    case 'admin':
      return 'Administración';
    case 'operador':
      return 'Operador';
    case 'voluntario':
      return 'Voluntario';
    default:
      return 'Usuario';
  }
}

// Permisos por ruta. Gana el prefijo más largo, así "/animales/seguimiento"
// puede ser más abierto que "/animales". Lo usan el middleware (servidor) y el menú.
const routeAccess: Array<{ prefix: string; roles: AppRole[] }> = [
  { prefix: '/', roles: ALL_ROLES },
  { prefix: '/animales', roles: STAFF_ROLES },
  { prefix: '/animales/seguimiento', roles: ALL_ROLES },
  { prefix: '/inventario', roles: STAFF_ROLES },
  { prefix: '/adopciones', roles: STAFF_ROLES },
  { prefix: '/agenda', roles: ALL_ROLES },
  { prefix: '/voluntariado', roles: ['admin', 'voluntario'] },
  { prefix: '/eventos', roles: ALL_ROLES },
  { prefix: '/reportes', roles: ALL_ROLES },
  { prefix: '/reportes/alertas', roles: STAFF_ROLES },
  { prefix: '/donaciones', roles: STAFF_ROLES },
  { prefix: '/usuarios', roles: ['admin'] },
];

function matchesPrefix(pathname: string, prefix: string) {
  if (prefix === '/') return true;
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function rolesForPath(pathname: string): AppRole[] {
  let best = routeAccess[0];
  for (const rule of routeAccess) {
    if (matchesPrefix(pathname, rule.prefix) && rule.prefix.length > best.prefix.length) {
      best = rule;
    }
  }
  return best.roles;
}

export function canAccessPath(role: AppRole, pathname: string) {
  return rolesForPath(pathname).includes(role);
}
