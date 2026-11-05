/**
 * Listas de palabras de referencia (revisadas a mano). Español de España, norma RAE 2010.
 *
 * Formato: las palabras con tilde se escriben tal cual; las palabras SIN tilde de más de una
 * sílaba llevan su clase acentual tras dos puntos (A = aguda, L = llana, E = esdrújula).
 * El test de validación del banco comprueba con el módulo de fonología que cada palabra es
 * coherente con su clase y con las reglas de la tilde.
 *
 * El número de cada lista es el nivel de dificultad base (1 = vocabulario cotidiano).
 */

export type Tier = 1 | 2 | 3;

const split = (s: string) => s.trim().split(/\s+/);

// ---------------- AGUDAS ----------------
export const AGUDAS_CON_TILDE: Record<Tier, string[]> = {
  1: split(`camión café sofá mamá papá bebé jamón ratón limón melón balón avión botón cajón
    corazón canción lección también además después compás menú champú bambú sillón montón
    pantalón salón millón razón perdón allá aquí allí así jamás detrás atrás autobús comí
    bebí viví salió comió llegó cantó saltó habló dormí está están será`),
  2: split(`colibrí jabalí anís maní ojalá quizás francés inglés japonés marqués ciempiés
    tazón cartón sartén almacén andén jardín delfín patín violín calcetín cojín
    acordeón camaleón pelotón escorpión televisión estación vendrá tendrá podrá
    comerá beberán vivirán saldrás jugué llegué empecé vivió escribió`),
  3: split(`adiós veintidós veintitrés dieciséis alemán capitán huracán volcán imán guardián
    rubí tabú hindú esquí Perú Panamá Canadá Japón Berlín París Moscú
    sofás interés atención emoción opinión ilusión explosión comunicación civilización`),
};

export const AGUDAS_SIN_TILDE: Record<Tier, string[]> = {
  1: split(`reloj:A pared:A comer:A beber:A vivir:A cantar:A saltar:A jugar:A papel:A azul:A
    feliz:A nariz:A ciudad:A verdad:A mitad:A edad:A señor:A color:A calor:A amor:A
    motor:A doctor:A profesor:A hospital:A animal:A caracol:A girasol:A pastel:A hotel:A
    español:A final:A igual:A`),
  2: split(`lombriz:A amistad:A salud:A virtud:A tractor:A ordenador:A farol:A mantel:A
    cartel:A nivel:A carnaval:A actriz:A cicatriz:A capaz:A disfraz:A arroz:A altavoz:A
    escribir:A dormir:A abrir:A sentir:A mujer:A ayer:A placer:A taller:A collar:A`),
  3: split(`virrey:A jersey:A convoy:A estoy:A Paraguay:A Uruguay:A robots:A
    complots:A sentimental:A universidad:A curiosidad:A tranquilidad:A
    responsabilidad:A`),
};

// ---------------- LLANAS ----------------
export const LLANAS_CON_TILDE: Record<Tier, string[]> = {
  1: split(`árbol lápiz fácil difícil útil móvil cárcel azúcar dólar fútbol túnel ángel
    álbum cómic López Pérez Gómez Martínez González Sánchez`),
  2: split(`débil césped cráter néctar mármol béisbol carácter récord huésped frágil ágil
    hábil fértil dócil cóndor mástil portátil automóvil inútil Fernández Rodríguez
    Gutiérrez Velázquez`),
  3: split(`bíceps cómics fórceps tríceps tórax ónix fénix versátil estéril revólver
    referéndum póster cáncer mártir`),
};

export const LLANAS_SIN_TILDE: Record<Tier, string[]> = {
  1: split(`casa:L mesa:L silla:L perro:L gato:L libro:L lunes:L martes:L zapato:L
    ventana:L camisa:L pelota:L escuela:L amigo:L hermano:L abuela:L mochila:L tortuga:L
    elefante:L jirafa:L manzana:L naranja:L fresa:L verano:L invierno:L sombrero:L
    tomate:L chocolate:L caramelo:L galleta:L`),
  2: split(`examen:L joven:L origen:L imagen:L volumen:L resumen:L margen:L crisis:L
    tesis:L dosis:L cumpleaños:L cuaderno:L lapicero:L canguro:L cocodrilo:L problema:L
    primavera:L otoño:L cereza:L aventura:L tormenta:L castillo:L mariposa:L`),
  3: split(`virgen:L certamen:L dictamen:L abdomen:L germen:L polen:L atlas:L
    paraguas:L sacapuntas:L tijeras:L viernes:L jueves:L`),
};

// ---------------- ESDRÚJULAS Y SOBRESDRÚJULAS ----------------
export const ESDRUJULAS: Record<Tier, string[]> = {
  1: split(`música pájaro árboles lámpara plátano brújula cámara máquina médico número
    página sábado miércoles teléfono película rápido último sílaba mágico cómico
    plástico bolígrafo`),
  2: split(`murciélago matemáticas gramática océano pirámide América África término
    fantástico simpático público práctica química física círculo triángulo kilómetro
    termómetro lógico árabe jóvenes exámenes imágenes`),
  3: split(`ejército espárrago helicóptero vehículo esdrújula tónica régimen orígenes
    volúmenes resúmenes hipopótamo electrónico informático
    atmósfera paréntesis`),
};

export const SOBRESDRUJULAS: string[] = split(`dígamelo cómetelo cuéntamelo explícaselo
  devuélvemelo tráemelo pídeselo cómpratelo llévatelo guárdamelo`);

// ---------------- HIATOS CON VOCAL CERRADA TÓNICA ----------------
export const HIATOS_ACENTUALES: Record<Tier, string[]> = {
  1: split(`día tía río frío mío María país raíz maíz baúl búho reír oír sandía alegría
    tenía comía vivía había sabía oído Lucía policía`),
  2: split(`freír ataúd laúd egoísta heroína cafeína increíble prohíbe reúne continúa
    actúa grúa púa caída leído creído energía geografía fotografía biología
    tecnología compañía economía panadería librería`),
  3: split(`vehículo Saúl Raúl Eloísa acentúa evalúa gradúa reúnen prohíben ahínco rehúso
    búhos transeúnte`),
};

// ---------------- DIPTONGOS Y TRIPTONGOS (para separar y clasificar) ----------------
export const DIPTONGOS: string[] = split(`cielo:L puerta:L aire:L causa:L ciudad:A ruido:L
  peine:L boina:L huevo:L agua:L nieve:L tierra:L fuego:L bueno:L piano:L viaje:L
  cuidado:L muela:L hielo:L jaula:L reino:L Europa:L deuda:L`);

export const TRIPTONGOS: string[] = split(`buey Uruguay:A Paraguay:A averiguáis limpiéis
  miau estudiáis cambiáis`);

// ---------------- HIATOS SIN TILDE (dos vocales abiertas) ----------------
export const HIATOS_SIMPLES: string[] = split(`leer:A caos:L poeta:L héroe océano teatro:L
  paseo:L museo:L idea:L correo:L creer:A peor:A aéreo canoa:L feo:L`);

// ---------------- MONOSÍLABOS SIN TILDE ----------------
export const MONOSILABOS: string[] = split(`fue fui dio vio pie guion truhan ti fe di vi
  bien mes pez sol pan mar luz sal tren gris fin tres dos vez voz miel fiel rey hoy muy
  soy doy voy pies cien Dios`);

/** Monosílabos que la gente suele escribir mal con tilde (distractor tentador). */
export const MONOSILABOS_TRAMPA = new Set(['fue', 'fui', 'dio', 'vio', 'pie', 'guion', 'truhan', 'ti', 'fe', 'di', 'vi', 'Dios']);

/**
 * Palabras cuya variante con/sin tilde TAMBIÉN existe (papá/papa, cantó/canto, sabía/sabia…).
 * No se usan en "¿Cuál está bien escrita?" ni en "Pon la tilde", porque ambas respuestas serían válidas.
 */
export const AMBIGUAS = new Set(
  split(`papá mamá bebé está llegó cantó saltó habló llegué inglés marqués público práctica
    último número término círculo médico página máquina dólar río frío tenía sabía continúa
    Lucía libro hablo canto salto termino`),
);
