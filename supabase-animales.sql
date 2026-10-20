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

-- Perfil público para la página de adopción (/adopta). Solo rellena lo que aún esté vacío.
update public.animals a
set public_description = coalesce(a.public_description, p.public_description),
    size = coalesce(a.size, p.size),
    energy = coalesce(a.energy, p.energy),
    vaccinated = coalesce(a.vaccinated, p.vaccinated),
    sterilized = coalesce(a.sterilized, p.sterilized),
    good_with_kids = coalesce(a.good_with_kids, p.good_with_kids),
    good_with_dogs = coalesce(a.good_with_dogs, p.good_with_dogs),
    good_with_cats = coalesce(a.good_with_cats, p.good_with_cats)
from (values
  ('Luna', 'Luna es pura dulzura: le encanta recibir a todos moviendo la cola y echarse a tus pies mientras trabajas. Camina muy bien con correa y aprende rápido. Ideal para una familia que busca una compañera tranquila y cariñosa.', 'Mediano', 'Moderado', true, true, true, true, null),
  ('Milo', 'Milo es un gato joven, curioso y conversador. Está terminando un tratamiento sencillo para la piel y muy pronto estará listo para irse a casa. Le gusta perseguir juguetes con plumas y dormir al sol.', 'Pequeño', 'Muy activo', true, true, true, null, true),
  ('Nilo', 'Nilo es un pastor alemán noble, leal e inteligente. Necesita una familia activa, con experiencia en perros grandes, que le dé paseos largos y retos para su mente. Con su gente es un osito.', 'Grande', 'Muy activo', true, true, false, true, false),
  ('Kiko', 'Kiko es un gato tranquilo y paciente al que le encantan los niños. Ronronea en cuanto lo cargas y se adapta bien a departamentos.', 'Pequeño', 'Tranquilo', true, true, true, null, true),
  ('Canela', 'Canela vivió muchos años con una señora que la adoraba y busca un nuevo hogar donde seguir siendo consentida. Es tranquila, educada en casa y perfecta para departamento. Su pelaje necesita cepillado frecuente.', 'Mediano', 'Tranquilo', true, true, true, true, true),
  ('Toby', 'Toby es un beagle feliz con un olfato increíble. Le encantan los paseos largos y los juegos de buscar premios. Su adopción ya está en proceso, ¡pero tenemos más amigos esperando!', 'Mediano', 'Muy activo', true, true, true, true, null),
  ('Rocky', 'Rocky es un bulldog bonachón que ama las siestas y los mimos. Está terminando un tratamiento para su piel. Es ideal para una familia tranquila, sin escaleras y con aire fresco en verano.', 'Mediano', 'Tranquilo', true, true, true, true, null),
  ('Copito', 'Copito es pequeño, peludo y muy apegado a las personas. Su sueño es acompañar a alguien en casa todo el día: es perfecto para adultos mayores o personas que trabajan desde casa.', 'Pequeño', 'Tranquilo', true, true, true, true, true),
  ('Miel', 'Miel es una cachorrita de 5 meses llena de energía y ganas de aprender. Busca una familia paciente que la eduque con cariño. Ya tiene su primera vacuna y será esterilizada al cumplir la edad.', 'Grande', 'Muy activo', true, false, true, true, true),
  ('Manchas', 'Manchas es un atleta: corre, salta y trae la pelota mil veces. Necesita una casa con jardín y una familia deportista que lo saque a correr. A cambio te dará lealtad absoluta.', 'Grande', 'Muy activo', true, true, true, true, false),
  ('Coco', 'Coco ya encontró su hogar. ¡Gracias a su familia por adoptarlo!', 'Pequeño', 'Moderado', true, true, true, true, true),
  ('Firulais', 'Firulais vivió en la calle y llegó muy delgado; hoy está sano y con su peso ideal. Al principio es tímido, pero cuando confía es el perro más noble que conocerás. Busca un hogar paciente y sin prisas.', 'Mediano', 'Moderado', true, true, false, true, null),
  ('Bruno', 'Bruno es listo y obediente: sabe sentarse, dar la pata y esperar su comida. Convive bien con gatos y otros perros. Ideal para una familia que quiera un compañero de aventuras.', 'Mediano', 'Moderado', true, true, true, true, true),
  ('Lola', 'Lola es una abuelita de 10 años muy dulce. Le gustan los paseos cortos, las camas mullidas y que le rasquen las orejas. Toma un suplemento para sus articulaciones. Adoptar a un senior es regalarle sus mejores años.', 'Mediano', 'Tranquilo', true, true, true, true, null),
  ('Nala', 'Nala es curiosa, juguetona y una gran ronroneadora. Está esterilizada, vacunada y con prueba de leucemia felina negativa. Se adapta muy bien a departamento.', 'Pequeño', 'Moderado', true, true, true, null, true),
  ('Simba', 'Simba es un gatito de 3 meses que no para de jugar. Se adaptaría mejor junto a otro gato joven para gastar energía. Ya tiene su primera vacuna.', 'Pequeño', 'Muy activo', true, false, true, null, true),
  ('Bigotes', 'Bigotes perdió un ojo antes de llegar al refugio, pero eso no le quita nada: es tranquilo, cariñoso y ama dormir en las piernas de alguien. Busca un hogar calmado donde pasar una vida feliz.', 'Pequeño', 'Tranquilo', true, true, true, false, true),
  ('Humo', 'Humo es tímido al principio y muy cariñoso cuando toma confianza. Su adopción está en proceso.', 'Pequeño', 'Tranquilo', true, true, false, null, false),
  ('Mía', 'Mía es sociable con personas y con otros gatos. Está terminando su tratamiento antiparasitario y en pocos días estará lista para conocer a su familia.', 'Pequeño', 'Moderado', true, true, true, null, true)
) as p(name, public_description, size, energy, vaccinated, sterilized, good_with_kids, good_with_dogs, good_with_cats)
where lower(a.name) = lower(p.name);
