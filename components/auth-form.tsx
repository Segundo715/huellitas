'use client';

import { useRef, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, Hand, Loader2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { z } from 'zod';
import { clearStoredSession, demoUsers, setStoredSession } from '@/lib/auth-demo';
import { isAppRole } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/client';
import { isDemoMode } from '@/lib/supabase/config';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Escribe un correo válido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
});

type Field = keyof z.infer<typeof loginSchema>;
type FieldErrors = Partial<Record<Field, string>>;

// Evita redirecciones abiertas: solo rutas internas.
function safeNext(next: string | undefined) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

const errorMessages: Record<string, string> = {
  'sin-rol': 'Tu cuenta no tiene un rol asignado. Pide a administración que te asigne un rol.',
  config: 'No está configurada la conexión de Supabase. El acceso al panel está bloqueado hasta corregirla.',
};

// Traduce los errores de Supabase Auth a mensajes claros.
function signInErrorMessage(error: { message?: string; status?: number } | null) {
  if (!error) return 'Correo o contraseña incorrectos.';
  if (error.message === 'Email not confirmed') return 'Confirma tu correo antes de iniciar sesión.';
  if (error.status === 429) return 'Demasiados intentos. Espera unos minutos y vuelve a probar.';
  if (error.message?.toLowerCase().includes('fetch')) return 'No hay conexión con el servidor. Revisa tu internet.';
  return 'Correo o contraseña incorrectos.';
}

export function AuthForm({ next, initialError }: { next?: string; initialError?: string }) {
  const demoMode = isDemoMode();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Sacude el formulario para que el error no pase desapercibido.
  const shake = () => {
    const form = formRef.current;
    if (!form) return;
    form.classList.remove('shake');
    void form.offsetWidth;
    form.classList.add('shake');
  };

  // Muestra «¡Bienvenido!» un instante antes de entrar al panel.
  const enter = async (destination: string) => {
    setSuccess(true);
    await new Promise((resolve) => setTimeout(resolve, 450));
    window.location.assign(destination);
  };
  const [error, setError] = useState(initialError ? (errorMessages[initialError] ?? '') : '');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [form, setForm] = useState({ email: '', password: '' });

  const updateField = (field: Field, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setError('');
  };

  const enterDemoUser = async (email: string, user: (typeof demoUsers)[string]) => {
    setLoading(true);
    clearStoredSession();
    setStoredSession({ id: email, email, name: user.name, role: user.role });
    await enter(safeNext(next));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (demoMode) {
      setError('Elige una cuenta local de demostración.');
      return;
    }

    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as Field;
        errors[field] ??= issue.message;
      }
      setFieldErrors(errors);
      (errors.email ? emailRef : passwordRef).current?.focus();
      shake();
      return;
    }

    const { email, password } = parsed.data;
    setFieldErrors({});
    setLoading(true);

    try {
      const supabase = createClient();
      if (!supabase) {
        throw new Error('Falta configurar NEXT_PUBLIC_SUPABASE_URL y la clave publicable en .env.local.');
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError || !data.user) {
        throw new Error(signInErrorMessage(signInError));
      }

      if (!isAppRole(data.user.app_metadata.role)) {
        await supabase.auth.signOut();
        throw new Error(errorMessages['sin-rol']);
      }

      // Recarga completa para que el middleware lea las cookies nuevas.
      await enter(safeNext(next));
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : '';
      setError(message.toLowerCase().includes('fetch') ? 'No hay conexión con el servidor. Revisa tu internet.' : message || 'No se pudo iniciar sesión.');
      setLoading(false);
      passwordRef.current?.select();
      shake();
    }
  };

  const detectCapsLock = (event: React.KeyboardEvent<HTMLInputElement>) => setCapsLock(event.getModifierState('CapsLock'));

  return (
    <div className="w-full">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Acceso</p>
      <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        Hola de nuevo{' '}
        <Hand aria-hidden="true" className="inline-block h-8 w-8 origin-[70%_80%] animate-[wiggle_1.2s_ease-in-out_2] align-[-0.1em] text-amber-500 sm:h-9 sm:w-9" />
      </h2>
      <p className="mt-2 text-muted-foreground">Inicia sesión para gestionar el refugio.</p>

      <div className="mt-6 flex items-center gap-3 rounded-xl border border-sky-100 bg-sky-50/80 px-4 py-3 text-sm text-sky-800">
        <ShieldCheck aria-hidden="true" className="h-5 w-5 shrink-0" />
        <span>{demoMode ? 'Modo demo: los datos se guardan solo en este navegador.' : 'Acceso protegido con Supabase Auth y roles.'}</span>
      </div>

      {demoMode ? (
        <div role="group" aria-label="Cuentas de demostración" className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          {Object.entries(demoUsers).map(([email, user]) => {
            return (
              <button
                key={email}
                type="button"
                aria-label={`Entrar en modo local como ${user.role}`}
                disabled={loading}
                onClick={() => void enterDemoUser(email, user)}
                className="group relative rounded-xl border bg-card px-3 py-2 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
              >
                <span className="block font-semibold capitalize text-foreground">{user.role}</span>
                <span className="block truncate text-xs text-muted-foreground">{email}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {!demoMode ? <form ref={formRef} onSubmit={handleSubmit} onAnimationEnd={(e) => e.currentTarget.classList.remove('shake')} className="mt-8" noValidate aria-busy={loading}>
        <fieldset disabled={loading} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <div className="relative">
              <Mail aria-hidden="true" className={cn('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground', fieldErrors.email && 'text-rose-500')} />
              <Input
                ref={emailRef}
                id="email"
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus={!demoMode}
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                className={cn('h-11 pl-9', fieldErrors.email && 'border-rose-400 focus-visible:border-rose-400 focus-visible:ring-rose-400/40')}
                placeholder="tu@correo.org"
                required
              />
            </div>
            {fieldErrors.email ? (
              <p id="email-error" className="text-xs font-medium text-rose-600">
                {fieldErrors.email}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <LockKeyhole aria-hidden="true" className={cn('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground', fieldErrors.password && 'text-rose-500')} />
              <Input
                ref={passwordRef}
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
                onKeyDown={detectCapsLock}
                onKeyUp={detectCapsLock}
                onBlur={() => setCapsLock(false)}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={[fieldErrors.password && 'password-error', capsLock && 'password-caps'].filter(Boolean).join(' ') || undefined}
                className={cn('h-11 px-9', fieldErrors.password && 'border-rose-400 focus-visible:border-rose-400 focus-visible:ring-rose-400/40')}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password ? (
              <p id="password-error" className="text-xs font-medium text-rose-600">
                {fieldErrors.password}
              </p>
            ) : null}
            {capsLock ? (
              <p id="password-caps" className="text-xs font-medium text-amber-600">
                Bloq Mayús está activado.
              </p>
            ) : null}
          </div>

          {error ? (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 animate-in fade-in-0 slide-in-from-top-1">
              <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <Button type="submit" size="lg" className={cn('group w-full transition-colors duration-300', success && '!bg-none bg-emerald-500 shadow-emerald-500/30 hover:bg-emerald-500 disabled:opacity-100')}>
            {success ? (
              <>
                <CheckCircle2 aria-hidden="true" className="animate-in zoom-in-50 duration-300" /> ¡Bienvenido!
              </>
            ) : loading ? (
              <>
                <Loader2 aria-hidden="true" className="animate-spin" /> Iniciando sesión…
              </>
            ) : (
              <>
                Entrar al panel <ArrowRight aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>
        </fieldset>
      </form> : null}
    </div>
  );
}
