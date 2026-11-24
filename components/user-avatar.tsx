'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export function UserAvatar({ path, initials, className }: { path?: string | null; initials: string; className?: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setImageUrl(null);

    if (!path) return () => { active = false; };

    const supabase = createClient();
    if (!supabase) return () => { active = false; };

    supabase.storage.from('staff-avatars').createSignedUrl(path, 3600).then(({ data, error }) => {
      if (active && !error) setImageUrl(data.signedUrl);
    });

    return () => {
      active = false;
    };
  }, [path]);

  return (
    <span className={cn('relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-xs font-bold text-white', className)}>
      {imageUrl ? <Image src={imageUrl} alt="" fill sizes="40px" unoptimized className="object-cover" /> : initials}
    </span>
  );
}