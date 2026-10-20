'use client';

import { useEffect, useState } from 'react';

// Muestra «⌘» en Mac y «Ctrl» en el resto, para que el atajo indicado sea el real.
export function ModKey() {
  const [mac, setMac] = useState(false);
  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)), []);
  return <>{mac ? '⌘' : 'Ctrl'}</>;
}
