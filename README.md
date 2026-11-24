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
- Gestión de cuentas staff desde Usuarios, con rol asignado en `app_metadata`
- Perfil personal editable con avatar en un bucket privado de Supabase Storage
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
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
```

`NEXT_PUBLIC_SITE_URL` es la dirección pública del sitio: se usa en el sitemap y en la vista previa (foto y texto) que aparece al compartir el perfil de un animal por WhatsApp o redes. En Vercel se toma sola del dominio de producción.

La clave publicable se utiliza con RLS. No pongas claves `sb_secret_*` ni `service_role` en variables `NEXT_PUBLIC_*` ni en el navegador. El modo real es el predeterminado. El demo solo se habilita localmente, fuera de producción, configurando explícitamente `NEXT_PUBLIC_DEMO_MODE=true`; jamás se usa para autorizar el sitio publicado.

## Conectar Supabase (modo real)

1. En Supabase → **Project Settings → API**, copia la **Project URL** y la **publishable key** a `.env.local`.
2. Abre **SQL Editor**, pega `supabase-schema.sql` completo y ejecútalo (es re-ejecutable).
   - Opcional: ejecuta también `supabase-animales.sql` para cargar 19 animales de ejemplo con fotos reales (WebP en `public/fotos/animales`, créditos en `CREDITOS.md`).
3. En **Authentication → Users** crea tus usuarios (Add user → con contraseña, marcando *Auto Confirm*).
4. Asigna el rol a cada usuario en el SQL Editor: `select public.shelter_set_user_role('admin', 'correo@ejemplo.com');` (roles: `admin`, `operador`, `voluntario`). El usuario debe cerrar sesión y volver a entrar.
5. Mantén `NEXT_PUBLIC_DEMO_MODE=false` y reinicia `npm run dev`.

### Compartir el proyecto con la app Android

Este panel usa `staff_profiles` y `shelter_adoption_requests` para no chocar con las tablas `profiles` y `adoption_requests` de la app. El trigger del panel también tiene un nombre propio y solo crea perfiles para cuentas con rol `admin`, `operador` o `voluntario` en `app_metadata`; las cuentas normales de Android no se agregan al panel.

Para crear solo los perfiles y roles de staff sin instalar las demás tablas del refugio, ejecuta [supabase-staff-schema.sql](supabase-staff-schema.sql) en el SQL Editor.

Para crear solo la tabla de solicitudes internas del refugio, ejecuta [supabase-shelter-adoptions.sql](supabase-shelter-adoptions.sql). No modifica `adoption_requests` de Android.

Antes de ejecutar el esquema en el proyecto compartido, coordina el orden de scripts con el equipo Android y revisa cualquier tabla compartida adicional. No ejecutes una copia anterior del esquema que use los nombres `profiles` o `adoption_requests`.

Los ejemplos para `mod_list_reports`, `mod_resolve_report`, `mod_restore`, `mod_get_chat_context` y Realtime están en [docs/moderacion-nextjs.md](docs/moderacion-nextjs.md). Las consultas de chat deben originarse siempre desde un reporte y usar las RPC `mod_*`.

Para habilitar únicamente las fotos de perfil, ejecuta [supabase-profile-storage.sql](supabase-profile-storage.sql) en el SQL Editor. Ese archivo crea el bucket privado y sus políticas sin modificar tablas de la app Android.

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
