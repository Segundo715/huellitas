# Moderacion desde el panel Next.js

La app Android y este panel usan el mismo proyecto Supabase. El panel debe usar la misma URL y la clave publicable (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`); nunca uses una clave `sb_secret_*` o `service_role` en el navegador.

## Preparacion del esquema

No ejecutes el esquema antiguo del panel. En este repositorio las tablas propias del refugio ya se llaman `staff_profiles` y `shelter_adoption_requests`, y sus triggers de `auth.users` usan nombres `shelter_*` para no sustituir los triggers de Android. Los usuarios sin rol de staff no se copian a `staff_profiles`.

Coordina con el equipo Android la ejecucion en este orden:

1. `adopcion_chat.sql`
2. `adopcion_chat_avisos.sql`
3. `moderacion.sql`
4. El esquema compatible del panel, solo despues de revisar cualquier otra tabla que comparta nombre.

El archivo `moderacion.sql` y las funciones `mod_*` deben estar instalados antes de activar la pantalla de moderacion. Asigna el rol mediante SQL despues de crear al usuario en Supabase Auth:

```sql
select public.shelter_set_user_role('admin', 'admin@ejemplo.com');
```

El usuario debe cerrar sesion e iniciarla de nuevo para recibir el rol en su token. Solo `admin` y `operador` pueden moderar; `voluntario` no.

## Cliente y listado de reportes

Obtiene el cliente del proyecto para cada uso; el cliente publica la sesion del usuario y las RPC validan el rol en el servidor:

```ts
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
if (!supabase) throw new Error('Falta configurar Supabase');

const { data, error } = await supabase.rpc('mod_list_reports', {
  p_status: 'pendiente', // 'pendiente' | 'revisado' | 'descartado' | 'todos'
  p_limit: 100,
});
if (error) throw error;

// Filas: report_id, target_type, target_id, reason, details, status,
// report_count, created_at, preview, image_url, is_sensitive, target_hidden,
// author_id, author_name y post_id (para comentarios).
```

Un error `42501` significa que la sesion no tiene un rol autorizado. No uses `service_role` para evitar RLS.

## Resolver y restaurar contenido

```ts
const { error } = await supabase.rpc('mod_resolve_report', {
  p_report: reportId,
  p_action: 'ocultar', // 'ocultar' | 'sensible' | 'descartar'
  p_note: 'Motivo de la decision',
});
if (error) throw error;

const { error: restoreError } = await supabase.rpc('mod_restore', {
  p_type: 'post', // 'post' | 'comment'
  p_id: targetId,
  p_note: 'Revision completada',
});
if (restoreError) throw restoreError;
```

La accion `sensible` aplica a publicaciones. Si `is_sensitive` es verdadero, muestra `image_url` borrosa hasta que la persona elija verla. Las acciones se registran en `moderation_log`.

## Abrir un chat reportado

No consultes `posts`, `comments` ni `adoption_messages` directamente, ni listes conversaciones. El contexto de mensajes solo se obtiene desde un reporte y cada apertura queda auditada:

```ts
const { data: context, error } = await supabase.rpc('mod_get_chat_context', {
  p_report: reportId,
});
if (error) throw error;
```

La RPC devuelve el mensaje reportado y contexto limitado (aproximadamente diez mensajes alrededor). Mantén esa vista dentro del detalle del reporte.

## Aviso en vivo de reportes nuevos

Suscribete al insertar en `content_reports`. La tabla debe estar en la publicacion `supabase_realtime` y RLS debe limitar la lectura a staff. Limpia el canal al desmontar el componente:

```ts
useEffect(() => {
  const supabase = createClient();
  if (!supabase) return;

  const channel = supabase
    .channel('moderation-reports')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'content_reports' },
      () => {
        void refreshReports();
        toast('Llego un reporte nuevo');
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}, [refreshReports]);
```

El evento solo sirve como aviso; vuelve a consultar `mod_list_reports` para obtener los datos autorizados. Para el contador de pendientes, puede usarse una consulta `head` con `count: 'exact'` sobre `content_reports`, limitada por RLS:

```ts
const { count, error } = await supabase
  .from('content_reports')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'pendiente');
if (error) throw error;
```

No muestres ni guardes mensajes fuera del flujo de un reporte. Activa TOTP para las cuentas staff desde la configuracion de autenticacion de Supabase y registra en los terminos que un chat puede revisarse cuando es reportado.
