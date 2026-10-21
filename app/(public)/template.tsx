// A diferencia del layout, el template se vuelve a montar en cada navegación:
// así cada página pública entra con una transición suave.
export default function PublicTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page">{children}</div>;
}
