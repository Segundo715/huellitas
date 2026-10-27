# Huellitas

Panel administrativo para gestionar un refugio de animales, su inventario, solicitudes de adopción y reportes de bienestar. El proyecto está construido con Next.js 15, TypeScript y Tailwind CSS, con autenticación y base de datos en Supabase.

## Stack
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Supabase Auth + Postgres
- Zod

## Funcionalidades
- Login seguro con Supabase Auth
- Dashboard con datos reales: animales, adopciones en proceso, alertas de inventario, balance del mes y lista de pendientes (vista simplificada para voluntarios)
- Gestión de animales / expedientes
- Inventario con control de stock y caducidad
- Solicitudes de adopción en Supabase: vista de lista y tablero por etapas, vínculo con el expediente del animal y aviso de solicitudes estancadas
- Adopciones particulares
- Reportes ciudadano y seguimiento
- Donaciones / finanzas en Supabase: ingresos y gastos por categoría, gráfica de los últimos 6 meses, filtros por periodo y exportación a CSV

## Requisitos
- Node.js 18+
- npm
- Cuenta de Supabase activa

## Inicio rápido

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abre http://localhost:3000

## Variables de entorno

Crea tu archivo `.env.local` con estas variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_reemplazar
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
```

`NEXT_PUBLIC_SITE_URL` es la dirección pública del sitio: se usa en el sitemap y en la vista previa (foto y texto) que aparece al compartir el perfil de un animal por WhatsApp o redes. En Vercel se toma sola del dominio de producción.

La clave publicable se utiliza con RLS. No pongas claves `sb_secret_*` ni `service_role` en variables `NEXT_PUBLIC_*` ni en el navegador. Para usar Supabase Auth y Postgres, cambia `NEXT_PUBLIC_DEMO_MODE=false` y reinicia el servidor.

## Conectar Supabase (modo real)

1. En Supabase → **Project Settings → API**, copia la **Project URL** y la **publishable key** a `.env.local`.
2. Abre **SQL Editor**, pega `supabase-schema.sql` completo y ejecútalo (es re-ejecutable).
   - Opcional: ejecuta también `supabase-animales.sql` para cargar 19 animales de ejemplo con fotos reales (WebP en `public/fotos/animales`, créditos en `CREDITOS.md`).
3. En **Authentication → Users** crea tus usuarios (Add user → con contraseña, marcando *Auto Confirm*).
4. Asigna el rol a cada usuario en el SQL Editor: `select public.set_user_role('correo@ejemplo.com', 'admin');` (roles: `admin`, `operador`, `voluntario`). El usuario debe cerrar sesión y volver a entrar.
5. Pon `NEXT_PUBLIC_DEMO_MODE=false` y reinicia `npm run dev`.

### Seguridad
- Cabeceras HTTP de seguridad en todas las respuestas (`next.config.ts`): sin iframes externos, `nosniff`, HSTS y política de permisos.
- La sesión vive en cookies de Supabase y el **middleware** valida el usuario y su rol en cada petición (`lib/auth/roles.ts` define qué rol entra a cada ruta).
- Las tablas tienen **RLS**: solo `admin` y `operador` pueden leer/escribir animales, notas, inventario, solicitudes de adopción y movimientos financieros, aunque alguien manipule el navegador.
- El rol se guarda en `app_metadata`, que el usuario no puede modificar.
- La clave `sb_secret_` / `service_role` **no se usa** y nunca debe ir en el frontend.

## UI

Componentes de [shadcn/ui](https://ui.shadcn.com) en `components/ui` (Button, Card, Dialog, AlertDialog, DropdownMenu, Table, Badge…) y notificaciones con Sonner. Puedes añadir más con `npx shadcn@latest add <componente>`.

## Estructura principal

```text
app/
├── (dashboard)/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── animales/
│   ├── inventario/
│   ├── adopciones/
│   ├── reportes/
│   └── donaciones/
├── globals.css
├── layout.tsx
├── login/
├── page.tsx
components/
├── animal-manager.tsx
├── auth-form.tsx
├── dashboard-shell.tsx
├── inventory-manager.tsx
lib/
├── supabase/
│   ├── client.ts
│   └── server.ts
middleware.ts
supabase-schema.sql
```

## Login de prueba

En modo demo usa las credenciales mostradas en el login. En modo real, el formulario valida usuarios creados en Supabase Auth.

## Producción

```bash
npm run build
npm run start
```
