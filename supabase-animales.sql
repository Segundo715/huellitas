-- Animales de ejemplo con fotos reales (WebP en public/fotos/animales).
-- Ejecútalo en el SQL Editor de Supabase después de supabase-schema.sql.
-- Es seguro repetirlo: no duplica animales (compara por nombre) ni pisa fotos que ya hayas subido.

with seed(name, type, breed, age_years, status, weight_kg, sex, location, notes, photo_webp) as (
  values
  ('Luna', 'Perro', 'Mestiza', 2, 'Disponible', 18.5, 'Hembra', 'Área A / Sala 2', 'Muy sociable y tranquila. Convive bien con otros perros y con niños. Esterilizada y con vacunas al día.', '/fotos/animales/luna.webp'),
  ('Milo', 'Gato', 'Doméstico atigrado', 1, 'En tratamiento', 4.8, 'Macho', 'Área B / Sala 1', 'Control de piel y revisión. Come bien y está muy activo; alta estimada en dos semanas.', '/fotos/animales/milo.webp'),
  ('Nilo', 'Perro', 'Pastor alemán', 4, 'Disponible', 24, 'Macho', 'Área A / Sala 3', 'Rescatado de la calle. Leal y protector; necesita ejercicio diario y una familia con experiencia. Esterilizado.', '/fotos/animales/nilo.webp'),
  ('Kiko', 'Gato', 'Criollo', 3, 'Reservado', 5.4, 'Macho', 'Área B / Sala 2', 'Muy cariñoso con niños. Adopción en proceso: entrevista aprobada, falta la visita domiciliaria.', '/fotos/animales/kiko.webp'),
  ('Canela', 'Perro', 'Cocker spaniel mestiza', 5, 'Disponible', 12, 'Hembra', 'Área A / Sala 1', 'Llegó tras el fallecimiento de su dueño. Cariñosa y tranquila, ideal para departamento. Requiere cepillado frecuente.', '/fotos/animales/canela.webp'),
  ('Toby', 'Perro', 'Beagle', 3, 'Reservado', 11.5, 'Macho', 'Área A / Sala 4', 'Juguetón y con gran olfato; necesita paseos largos. Adopción en proceso con una familia de Coyoacán.', '/fotos/animales/toby.webp'),
  ('Rocky', 'Perro', 'Bulldog inglés', 6, 'En tratamiento', 23, 'Macho', 'Clínica / Recuperación', 'En tratamiento por dermatitis en los pliegues de la piel. Dócil y glotón; evitar ejercicio intenso con calor.', '/fotos/animales/rocky.webp'),
  ('Copito', 'Perro', 'Mestizo (Shih tzu)', 7, 'Disponible', 6.5, 'Macho', 'Área C / Sala 1', 'Pequeño y muy apegado a las personas. Ideal para adultos mayores. Pendiente limpieza dental.', '/fotos/animales/copito.webp'),
  ('Miel', 'Perro', 'Golden retriever mestiza', 0.4, 'Disponible', 9, 'Hembra', 'Área C / Cachorros', 'Cachorra de 5 meses rescatada con su camada. Primera vacuna aplicada; pendiente refuerzo y desparasitación.', '/fotos/animales/miel.webp'),
  ('Manchas', 'Perro', 'Dálmata', 3, 'Disponible', 25, 'Macho', 'Área A / Patio', 'Mucha energía: le encanta correr y traer palos. Mejor en casa con jardín y familia activa.', '/fotos/animales/manchas.webp'),
  ('Coco', 'Perro', 'Mestizo (Poodle)', 2, 'Adoptado', 8, 'Macho', 'Hogar adoptivo', 'Adoptado en septiembre. Seguimiento post-adopción: se adaptó muy bien a su nueva familia.', '/fotos/animales/coco.webp'),
  ('Firulais', 'Perro', 'Mestizo', 4, 'Disponible', 17, 'Macho', 'Área B / Sala 3', 'Rescatado de la calle con desnutrición; ya recuperó su peso. Algo tímido al principio, muy noble.', '/fotos/animales/firulais.webp'),
  ('Bruno', 'Perro', 'Mestizo (Airedale terrier)', 5, 'Disponible', 21, 'Macho', 'Área A / Sala 5', 'Inteligente y obediente: sabe sentarse y dar la pata. Se lleva bien con gatos.', '/fotos/animales/bruno.webp'),
  ('Lola', 'Perro', 'Beagle', 10, 'Disponible', 13, 'Hembra', 'Área C / Sala 2', 'Perrita senior muy tranquila. Toma suplemento para articulaciones. Busca un hogar para sus años dorados.', '/fotos/animales/lola.webp'),
  ('Nala', 'Gato', 'Doméstico naranja y blanco', 2, 'Disponible', 3.8, 'Hembra', 'Área B / Gatera 1', 'Curiosa y ronroneadora. Esterilizada, vacunada y con prueba de leucemia felina negativa.', '/fotos/animales/nala.webp'),
  ('Simba', 'Gato', 'Doméstico naranja', 0.3, 'Disponible', 1.2, 'Macho', 'Área B / Gatera 2', 'Gatito rescatado a los 2 meses. Muy juguetón; se adaptaría mejor junto a otro gato.', '/fotos/animales/simba.webp'),
  ('Bigotes', 'Gato', 'Doméstico bicolor', 6, 'Disponible', 5.2, 'Macho', 'Área B / Gatera 3', 'Perdió un ojo por una infección antes de llegar; ya está sano y usa prótesis ocular. Muy tranquilo.', '/fotos/animales/bigotes.webp'),
  ('Humo', 'Gato', 'Cartujo mestizo', 4, 'Reservado', 5.6, 'Macho', 'Área B / Gatera 1', 'Tímido al inicio y muy cariñoso cuando toma confianza. Reservado por una pareja sin otras mascotas.', '/fotos/animales/humo.webp'),
  ('Mía', 'Gato', 'Doméstico atigrado', 3, 'En tratamiento', 3.4, 'Hembra', 'Clínica / Recuperación', 'Rescatada de la calle; en tratamiento antiparasitario. Muy sociable con personas y otros gatos.', '/fotos/animales/mia.webp')
),
con_foto as (
  update public.animals a
  set photo_webp = seed.photo_webp,
      -- Milo venía como «Siamés» en los datos de ejemplo; su foto es de un atigrado.
      breed = case when a.breed = 'Siamés' then seed.breed else a.breed end
  from seed
  where lower(a.name) = lower(seed.name) and a.photo_webp is null
  returning a.id
)
insert into public.animals (name, type, breed, age_years, status, weight_kg, sex, location, notes, photo_webp)
select seed.* from seed
where not exists (select 1 from public.animals a where lower(a.name) = lower(seed.name));
