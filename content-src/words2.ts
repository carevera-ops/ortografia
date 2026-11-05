/**
 * Ampliación del banco (segunda tanda de palabras), mismo formato que words.ts:
 * con tilde, tal cual; sin tilde y de más de una sílaba, con su clase (:A, :L, :E).
 * Se han evitado verbos con forma doble (cantó/canto), palabras raras y casos dudosos.
 */
import type { Tier } from './words.ts';

const split = (s: string) => s.trim().split(/\s+/);

export const AGUDAS_CON_TILDE_2: Record<Tier, string[]> = {
  1: split(`acción nación región pasión visión misión unión reunión opción función ración
    algodón balcón bastón buzón cañón colchón cordón dragón escalón jabón melocotón
    pimentón rincón salmón tiburón turrón peatón ladrón campeón puré quizá maniquí iglú
    ñandú acá ciprés estrés portugués holandés escocés irlandés danés maletín botiquín
    festín vaivén rehén comí salí subí escribí abrí perdí aprendí corrí decidí subió
    abrió perdió aprendió corrió decidió sintió pidió durmió comerás beberás vivirás
    tendrás podrás sabrás vendrás dirás`),
  2: split(`porción presión tensión mansión pensión versión Martín Agustín
    Valentín Joaquín Benjamín Belén Rubén Germán Julián Sebastián Iván Adrián Simón
    Ramón Jesús Tomás Andrés Inés Moisés Matías bisturí chalé`),
  3: split(`atracción construcción revolución contaminación imaginación investigación
    exposición composición administración`),
};

export const AGUDAS_SIN_TILDE_2: Record<Tier, string[]> = {
  1: split(`maldad:A bondad:A libertad:A juventud:A humedad:A felicidad:A soledad:A
    abril:A barril:A carril:A perejil:A clavel:A pincel:A control:A alcohol:A
    avestruz:A veloz:A feroz:A antifaz:A dolor:A olor:A valor:A sabor:A actor:A autor:A
    pintor:A escritor:A lector:A conductor:A jugador:A ganador:A nadador:A bailar:A
    volar:A nadar:A pintar:A pensar:A soñar:A hogar:A lugar:A militar:A tenedor:A`),
  2: split(`actitud:A fusil:A marfil:A cordel:A cuartel:A tonel:A andaluz:A atroz:A
    matiz:A altar:A familiar:A carey:A zigzag:A tictac:A`),
  3: split(`honestidad:A electricidad:A velocidad:A oportunidad:A bistecs:A zigzags:A`),
};

export const LLANAS_CON_TILDE_2: Record<Tier, string[]> = {
  1: split(`ámbar dátil fósil trébol líder láser suéter Héctor Víctor Álvarez Núñez
    Jiménez Hernández Ramírez Domínguez`),
  2: split(`alcázar almíbar cadáver cáliz cóctel fémur níquel nácar volátil clímax
    récords`),
  3: split(`ónix póney yóquey`),
};

export const LLANAS_SIN_TILDE_2: Record<Tier, string[]> = {
  1: split(`plato:L vaso:L cuchara:L botella:L cocina:L nevera:L tejado:L pasillo:L
    escalera:L toalla:L estuche:L carpeta:L regla:L goma:L pupitre:L pizarra:L recreo:L
    patio:L alumno:L clase:L tarea:L domingo:L enero:L febrero:L marzo:L junio:L julio:L
    agosto:L octubre:L noviembre:L diciembre:L conejo:L oveja:L cabra:L cerdo:L burro:L
    gallo:L paloma:L ballena:L pulpo:L serpiente:L lagarto:L lobo:L foca:L patata:L
    tortilla:L pescado:L carne:L queso:L leche:L pera:L piña:L ensalada:L sopa:L pasta:L
    bocadillo:L helado:L tarta:L croqueta:L grande:L pequeño:L bonito:L alegre:L
    contento:L cansado:L lento:L fuerte:L dulce:L salado:L amargo:L`),
  2: split(`orden:L crimen:L relojes:L paredes:L colores:L papeles:L animales:L ciudades:L
    canciones:L ratones:L camiones:L leones:L botones:L aviones:L jardines:L
    caracteres:L`),
  3: split(`balonmano:L videojuego:L telaraña:L bienvenido:L`),
};

export const ESDRUJULAS_2: Record<Tier, string[]> = {
  1: split(`estómago lágrima tímido príncipe relámpago micrófono cómodo trágico
    pacífico pétalo ángulo águila búfalo góndola cápsula célula cántaro lápices
    eléctrico histórico artístico atlético romántico elástico pánico mecánico único
    húmedo sólido cálido pálido ácido árido`),
  2: split(`época polígono vértice diámetro centímetro milímetro periódico lámina átona
    gélido nítido fósforo dinámico económico académico político científico católico
    gótico exótico orgánico volcánico cerámica márgenes crímenes regímenes`),
  3: split(`sobresdrújula rectángulo cráteres`),
};

export const HIATOS_ACENTUALES_2: Record<Tier, string[]> = {
  1: split(`tranvía dúo vía lejía bujía poesía fantasía batería pastelería frutería
    carnicería peluquería zapatería juguetería mayoría simpatía valentía melodía
    tontería manía tío lío vacío escalofrío rocío países raíces baúles sonreír reído`),
  2: split(`Andalucía ganzúa ría cortesía geometría categoría minoría garantía
    cercanía armonía sinfonía ortografía caligrafía biografía filosofía ironía osadía
    egoísmo heroísmo creíble proteína navío gentío sombrío tardío desafío`),
  3: split(`mediodía hazmerreír`),
};

export const MONOSILABOS_2: string[] = split(`gas tos flor mil plan bar red sur paz cruz ley
  buey guau huir hui Ruiz Luis Juan`);
export const MONOSILABOS_TRAMPA_2 = ['huir', 'hui', 'Ruiz', 'Luis'];

/** Palabras de esta tanda cuya variante sin/con tilde también existe. */
export const AMBIGUAS_2 = split(`desafío lío vacío rocío lámina`);
