/**
 * Bloque B (ortografía general) y palabras de A15/A16.
 *
 * Parejas «correcta|incorrecta». La incorrecta NO debe ser otra palabra real
 * (por eso no aparecen pares como vaca/baca, pero/perro o casa/caza).
 * Cada grupo lleva su explicación y su regla.
 */

export interface PairGroup {
  regla: string;
  skill: string;
  explicacion: string;
  /** Dificultad base (1–3). */
  tier: number;
  pairs: string;
}

const g = (regla: string, skill: string, tier: number, explicacion: string, pairs: string): PairGroup => ({
  regla,
  skill,
  tier,
  explicacion,
  pairs,
});

export const B1: PairGroup[] = [
  g('b-v', 'b_v', 1, 'Delante de l y r siempre se escribe b: blanco, brazo, biblioteca.', 'blanco|vlanco brazo|vrazo biblioteca|bivlioteca hablar|havlar libro|livro abrir|avrir sombrero|somvrero'),
  g('b-v', 'b_v', 1, 'Antes de b y p se escribe m, nunca n: hombre, campo, tiempo.', 'hombre|honbre tambor|tanbor cambiar|canbiar campo|canpo lámpara|lánpara tiempo|tienpo empezar|enpezar siempre|sienpre bombero|bonbero hambre|hanbre'),
  g('b-v', 'b_v', 2, 'Después de n se escribe v: invierno, enviar, invitar.', 'invierno|inbierno enviar|enbiar invitar|inbitar convencer|conbencer'),
  g('b-v', 'b_v', 2, 'Las terminaciones -aba, -abas, -ábamos… del pasado (cantaba, jugaba) se escriben con b.', 'cantaba|cantava jugaba|jugava estaba|estava saltábamos|saltávamos pintabas|pintavas'),
  g('b-v', 'b_v', 2, 'Las palabras acabadas en -ble y -bilidad se escriben con b: amable, posible.', 'amable|amavle posible|posivle terrible|terrivle responsabilidad|responsavilidad'),
  g('b-v', 'b_v', 2, 'Los adjetivos acabados en -ivo, -iva se escriben con v: activo, divertida.', 'activo|actibo creativo|creatibo deportiva|deportiba'),
  g('b-v', 'b_v', 1, 'Es una palabra que hay que aprender de memoria: se escribe con b.', 'abuelo|avuelo bueno|vueno cabeza|caveza nube|nuve sábado|sávado trabajo|travajo bebé|vebé bicicleta|vicicleta bosque|vosque barco|varco'),
  g('b-v', 'b_v', 1, 'Es una palabra que hay que aprender de memoria: se escribe con v.', 'vivir|bibir verano|berano verde|berde llave|llabe nuevo|nuebo nueve|nuebe avión|abión uva|uba volver|bolver ventana|bentana viento|biento vestido|bestido lluvia|llubia televisión|telebisión divertido|dibertido nervioso|nerbioso joven|joben'),
];

export const B2: PairGroup[] = [
  g('g-j', 'g_j', 2, 'Los verbos acabados en -ger y -gir se escriben con g: coger, elegir (salvo tejer y crujir).', 'coger|cojer recoger|recojer proteger|protejer elegir|elejir dirigir|dirijir'),
  g('g-j', 'g_j', 2, 'Las palabras que empiezan por geo- y las acabadas en -logía se escriben con g.', 'geografía|jeografía biología|biolojía tecnología|tecnolojía'),
  g('g-j', 'g_j', 1, 'Es una palabra que se escribe con g: hay que aprenderla de memoria.', 'gente|jente girasol|jirasol gimnasio|jimnasio mágico|májico imagen|imajen general|jeneral página|pájina ángel|ánjel gigante|jigante energía|enerjía origen|orijen vigilar|vijilar agenda|ajenda ligero|lijero'),
  g('g-j', 'g_j', 2, 'Las palabras acabadas en -aje y -jero se escriben con j: viaje, pasajero.', 'viaje|viage garaje|garage mensaje|mensage paisaje|paisage lenguaje|lenguage equipaje|equipage personaje|personage pasajero|pasagero extranjero|extrangero'),
  g('g-j', 'g_j', 1, 'Es una palabra que se escribe con j: hay que aprenderla de memoria.', 'jirafa|girafa jinete|ginete jefe|gefe ojo|ogo abeja|abega reloj|relog jardín|gardín ajedrez|agedrez tejer|teger crujir|crugir dije|dige trajeron|trageron'),
  g('g-j', 'g_j', 2, 'Para el sonido «gue», «gui» se escribe gu (la u no suena); si la u suena, lleva diéresis: pingüino.', 'guitarra|gitarra guerra|gerra guiso|giso hoguera|hogera juguete|jugete pingüino|pinguino vergüenza|verguenza cigüeña|cigueña'),
];

export const B3: PairGroup[] = [
  g('h', 'h', 1, 'Las palabras que empiezan por hie-, hue-, hui- llevan h: hielo, huevo, huir.', 'hielo|ielo hueso|ueso huevo|uevo hueco|ueco huerto|uerto huella|uella huir|uir'),
  g('h', 'h', 2, 'Las palabras que empiezan por hum-, hip-, hosp-, hist- llevan h: humo, hipopótamo, hospital, historia.', 'humo|umo hipopótamo|ipopótamo hospital|ospital historia|istoria'),
  g('h', 'h', 1, 'Los verbos hacer, haber, hablar y habitar (y sus familias) llevan h.', 'hacer|acer hablar|ablar deshacer|desacer rehacer|reacer'),
  g('h', 'h', 1, 'Es una palabra con h que hay que aprender de memoria.', 'hormiga|ormiga helado|elado hermano|ermano ahora|aora búho|búo almohada|almoada zanahoria|zanaoria prohibido|proibido hoy|oy hambre|ambre hijo|ijo hilo|ilo cohete|coete vehículo|veículo hermoso|ermoso harina|arina horno|orno huele|uele'),
  g('h', 'h', 2, 'Esta palabra NO lleva h. ¡No pongas haches donde no van!', 'orden|horden aire|haire óvalo|hóvalo oler|holer olor|holor abuelo|habuelo alumno|halumno orilla|horilla uva|huva ermita|hermita'),
];

export const B4: PairGroup[] = [
  g('ll-y', 'll_y', 1, 'Las palabras acabadas en -illo, -illa llevan ll: silla, cepillo.', 'silla|siya cepillo|cepiyo ardilla|ardiya mantequilla|mantequiya rodilla|rodiya bombilla|bombiya cuchillo|cuchiyo pollito|poyito'),
  g('ll-y', 'll_y', 1, 'Es una palabra con ll que hay que aprender de memoria.', 'lluvia|yuvia llave|yave calle|caye caballo|cabayo gallina|gayina estrella|estreya llorar|yorar llegar|yegar lleno|yeno sello|seyo'),
  g('ll-y', 'll_y', 1, 'Es una palabra con y que hay que aprender de memoria.', 'playa|plalla yogur|llogur yema|llema ayer|aller ayuda|alluda joya|jolla payaso|pallaso yate|llate leyenda|lellenda yeso|lleso desayuno|desalluno'),
  g('r-rr', 'r_rr', 1, 'Entre vocales, el sonido fuerte de la r se escribe rr: tierra, carretera.', 'guitarra|guitara tierra|tiera carretera|caretera correr|corer arroz|aroz zorro|zoro cerrar|cerar ferrocarril|ferocarril pelirrojo|pelirojo'),
  g('r-rr', 'r_rr', 2, 'Al principio de palabra y detrás de n, l o s, el sonido fuerte se escribe con una sola r: ratón, Enrique, alrededor.', 'rata|rrata ratón|rratón rueda|rrueda ropa|rropa rosa|rrosa Enrique|Enrrique honrado|honrrado alrededor|alrrededor sonrisa|sonrrisa israelí|isrraelí'),
];

export const B5: PairGroup[] = [
  g('c-z', 'c_z', 1, 'Delante de e, i se escribe c (cielo, cereza); delante de a, o, u se escribe z (zapato, zorro).', 'zapato|sapato zorro|sorro cereza|sereza cielo|zielo cine|zine cinco|sinco cebolla|sebolla azúcar|asúcar zanahoria|sanahoria pizarra|pisarra plaza|plasa cazuela|casuela corazón|corasón'),
  g('c-z', 'c_z', 1, 'Las palabras que acaban en z hacen el plural en -ces: lápiz → lápices, pez → peces.', 'luces|luzes peces|pezes lápices|lápizes veces|vezes cruces|cruzes felices|felizes actrices|actrizes'),
  g('c-z', 'c_z', 1, 'Esta palabra acaba en -z, no en -s.', 'lápiz|lápis nariz|naris'),
  g('c-z', 'c_z', 2, 'Los verbos acabados en -cer y -cir se escriben con c: conocer, decir.', 'conocer|conoser nacer|naser hacer|haser decir|desir empezar|empesar'),
  g('x-s', 'x_s', 2, 'Esta palabra se escribe con x.', 'examen|esamen éxito|ésito taxi|tasi extraño|estraño explicar|esplicar excursión|escursión exterior|esterior texto|testo boxeo|boseo oxígeno|osígeno exacto|esacto explorar|esplorar'),
  g('x-s', 'x_s', 2, 'Esta palabra se escribe con s, no con x.', 'estrella|extrella espalda|expalda escuela|excuela esperar|experar estudiar|extudiar'),
];

/** B7 · Mayúsculas y puntuación: [correcta, incorrecta(s)…], explicación. */
export const B7: [string[], string][] = [
  [['Vivo en Madrid.', 'Vivo en madrid.', 'vivo en Madrid.'], 'Los nombres de ciudades y la primera palabra de un texto van con mayúscula.'],
  [['Mi perro se llama Toby.', 'Mi perro se llama toby.', 'mi perro se llama Toby.'], 'Los nombres propios (también los de mascotas) van con mayúscula.'],
  [['El lunes voy al médico.', 'El Lunes voy al médico.'], 'Los días de la semana se escriben con minúscula.'],
  [['Nací en enero.', 'Nací en Enero.'], 'Los meses se escriben con minúscula.'],
  [['Hoy es martes, 3 de marzo.', 'Hoy es Martes, 3 de Marzo.'], 'Días y meses van con minúscula.'],
  [['Mañana iremos al río Ebro.', 'Mañana iremos al Río Ebro.', 'Mañana iremos al río ebro.'], 'El nombre propio (Ebro) va con mayúscula; la palabra «río», con minúscula.'],
  [['Mi tía vive en Francia.', 'Mi tía vive en francia.', 'Mi Tía vive en Francia.'], 'Los nombres de países van con mayúscula; «tía» no es un nombre propio.'],
  [['Los españoles cenan tarde.', 'Los Españoles cenan tarde.'], 'Los gentilicios (español, francés…) se escriben con minúscula.'],
  [['Mis amigos son italianos.', 'Mis amigos son Italianos.'], 'Los gentilicios (italiano, alemán…) se escriben con minúscula.'],
  [['Juan es mexicano.', 'Juan es Mexicano.'], 'Los gentilicios se escriben con minúscula.'],
  [['¿Dónde está Lucía?', '¿dónde está Lucía?', '¿Dónde está lucía?'], 'Se escribe mayúscula al principio de la frase (aunque empiece por ¿) y en los nombres propios.'],
  [['Ayer llovió. Hoy hace sol.', 'Ayer llovió. hoy hace sol.'], 'Después de un punto se escribe mayúscula.'],
  [['El Atlántico es un océano.', 'El atlántico es un océano.'], 'Los nombres de océanos, mares y montañas van con mayúscula.'],
  [['El Teide es un volcán.', 'El teide es un volcán.'], 'Los nombres de montañas y volcanes van con mayúscula.'],
  [['En verano iré a Galicia.', 'En Verano iré a Galicia.'], 'Las estaciones del año se escriben con minúscula.'],
  [['En otoño caen las hojas.', 'En Otoño caen las hojas.'], 'Las estaciones del año se escriben con minúscula.'],
  [['Mi abuela se llama Carmen.', 'Mi Abuela se llama Carmen.'], '«Abuela» es un nombre común: va con minúscula.'],
  [['Ayer fui al dentista.', 'ayer fui al dentista.', 'Ayer fui al Dentista.'], 'Mayúscula al principio; «dentista» es un nombre común.'],
  [['Viajamos a Portugal en agosto.', 'Viajamos a portugal en agosto.', 'Viajamos a Portugal en Agosto.'], 'Países con mayúscula; meses con minúscula.'],
  [['Los domingos comemos paella.', 'Los Domingos comemos paella.'], 'Los días de la semana se escriben con minúscula.'],
  [['Hoy es miércoles.', 'Hoy es Miércoles.'], 'Los días de la semana se escriben con minúscula.'],
  [['Nos vemos en Navidad.', 'Nos vemos en navidad.'], 'Las fiestas (Navidad, Semana Santa) van con mayúscula.'],
  [['Me llamo Sara y vivo en Bilbao.', 'Me llamo sara y vivo en Bilbao.', 'Me llamo Sara y vivo en bilbao.'], 'Los nombres de personas y ciudades van con mayúscula.'],
  [['El perro de Juan ladra mucho.', 'El Perro de Juan ladra mucho.', 'el perro de Juan ladra mucho.'], 'Mayúscula al principio y en los nombres propios; «perro» es común.'],
  [['¿Has visto a Pablo?', '¿Has visto a pablo?', 'Has visto a Pablo?'], 'Los nombres propios llevan mayúscula y las preguntas se abren con ¿.'],
  [['Sevilla está en Andalucía.', 'Sevilla está en andalucía.'], 'Los nombres de ciudades y comunidades van con mayúscula.'],
  [['El colegio está en la calle Mayor.', 'El colegio está en la Calle Mayor.', 'El colegio está en la calle mayor.'], 'El nombre de la calle (Mayor) va con mayúscula; la palabra «calle», con minúscula.'],
  [['¿Qué hora es?', 'Qué hora es?', '¿Qué hora es¿'], 'En español las preguntas se abren con ¿ y se cierran con ?.'],
  [['¡Qué bonito!', 'Qué bonito!', '¡Qué bonito¡'], 'En español las exclamaciones se abren con ¡ y se cierran con !.'],
  [['¿Vienes al cine?', 'Vienes al cine?', '¿Vienes al cine.'], 'Las preguntas se abren con ¿ y se cierran con ?.'],
  [['Si vienes, ¿me traes un libro?', '¿Si vienes, me traes un libro?', 'Si vienes, me traes un libro?'], 'Los signos ¿? rodean solo la parte que pregunta.'],
  [['Hola, ¿cómo estás?', '¿Hola, cómo estás?', 'Hola, cómo estás?'], 'Los signos ¿? rodean solo la pregunta; «hola» va fuera.'],
  [['¡Hola!', 'Hola!', '¡Hola¡'], 'Las exclamaciones se abren con ¡ y se cierran con !.'],
  [['Luis, ¿has terminado?', '¿Luis, has terminado?'], 'El nombre de la persona a la que hablas va fuera de la pregunta y separado por coma.'],
  [['Pedro, ¿vienes?', '¿Pedro, vienes?'], 'El nombre de la persona a la que hablas va fuera de la pregunta y separado por coma.'],
  [['¡Feliz cumpleaños!', 'Feliz cumpleaños!', '¡Feliz cumpleaños.'], 'Las exclamaciones se abren con ¡ y se cierran con !.'],
  [['¿Quién ha llamado?', 'Quién ha llamado?', '¿Quien ha llamado?'], 'Pregunta con ¿? y «quién» con tilde porque pregunta.'],
  [['¿Cuántos años tienes?', 'Cuántos años tienes?', '¿Cuantos años tienes?'], 'Pregunta con ¿? y «cuántos» con tilde porque pregunta.'],
  [['¡Qué frío hace!', '¡Que frío hace!', 'Qué frío hace!'], 'Exclamación con ¡! y «qué» con tilde porque exclama.'],
  [['Mamá, ¿me ayudas?', 'Mamá ¿me ayudas?', '¿Mamá, me ayudas?'], 'Coma detrás del nombre de la persona a la que hablas, y ¿? solo en la pregunta.'],
  [['¿Sabes qué? ¡Hemos ganado!', '¿Sabes qué? hemos ganado!', 'Sabes qué? ¡Hemos ganado!'], 'Cada pregunta o exclamación lleva sus dos signos, y después de ? empieza una frase nueva con mayúscula.'],
  [['Me gustan las manzanas, las peras y las uvas.', 'Me gustan las manzanas, las peras, y las uvas.', 'Me gustan las manzanas las peras y las uvas.'], 'En una enumeración se separan los elementos con comas, pero NO se pone coma delante de la «y» final.'],
  [['Compré pan, leche y huevos.', 'Compré pan, leche, y huevos.', 'Compré, pan, leche y huevos.'], 'Comas entre los elementos de la lista, pero no delante de «y».'],
  [['Ana, Pedro y yo fuimos al cine.', 'Ana Pedro y yo fuimos al cine.', 'Ana, Pedro, y yo fuimos al cine.'], 'Comas entre los elementos de la lista, pero no delante de «y».'],
  [['Era alto, rubio y simpático.', 'Era alto rubio y simpático.', 'Era alto, rubio, y simpático.'], 'Comas entre los elementos de la lista, pero no delante de «y».'],
  [['María, ven aquí.', 'María ven aquí.', 'María, ven, aquí.'], 'El nombre de la persona a la que hablas se separa con una coma.'],
  [['Querida abuela:', 'Querida abuela,', 'Querida abuela;'], 'Después del saludo de una carta se ponen dos puntos.'],
  [['Tengo tres hermanos: Ana, Luis y Marta.', 'Tengo tres hermanos; Ana, Luis y Marta.', 'Tengo tres hermanos. Ana, Luis y Marta.'], 'Antes de una lista que anuncias se ponen dos puntos.'],
  [['¡Cuidado, que te caes!', 'Cuidado, que te caes!', '¡Cuidado, que te caes.'], 'Las exclamaciones se abren con ¡ y se cierran con !.'],
  [['¿Te gusta el chocolate?', 'Te gusta el chocolate?', '¿Te gusta el chocolate.'], 'Las preguntas se abren con ¿ y se cierran con ?.'],
];

// ---------------- A15 · -mente, compuestos y pronombres pegados ----------------
/** Adverbios en -mente con la clase del ADJETIVO (si no lleva tilde). */
export const MENTE: string[] = `rápidamente fácilmente difícilmente cómodamente últimamente únicamente
  prácticamente lógicamente débilmente ágilmente cortésmente comúnmente públicamente
  felizmente:A tranquilamente:L lentamente:L suavemente:L claramente:L igualmente:A
  finalmente:A totalmente:A realmente:A seguramente:L`
  .trim()
  .split(/\s+/);

export const COMPUESTOS: string[] = `decimoséptimo vigesimoprimero:L decimotercero:L decimoctavo:L
  asimismo:L puntapié ciempiés baloncesto:L pasatiempo:L medianoche:L abrelatas:L
  lavaplatos:L rompecabezas:L tiovivo:L sacapuntas:L cumpleaños:L hispanohablante:L`
  .trim()
  .split(/\s+/);

export const ENCLITICOS: string[] = `dímelo dame:L cómetelo dámelo cuéntame mírame díselo dile:L
  ponte:L siéntate levántate cállate acércate tráelo cógelo escríbeme mírala pásamelo
  cuéntaselo explícamelo dale:L hazlo:L ponlo:L vámonos estate:L oírlo`
  .trim()
  .split(/\s+/);

// ---------------- A16 · Mayúsculas con tilde ----------------
export const MAYUSCULAS: string[] = `Álvaro África Ángela Óscar Íñigo Ávila Úbeda Álava Ángel
  Ámsterdam Atlántico Mérida Málaga Córdoba Cádiz León Japón Perú Canadá Panamá
  CAMIÓN ÁRBOL MÚSICA PAÍS ÁFRICA LÁPIZ JAMÁS ÚLTIMO ÉXITO ÁGUILA ÓRGANO`
  .trim()
  .split(/\s+/);
