/**
 * Segunda tanda del bloque B y de A15 (mismo formato que spelling.ts).
 * La forma incorrecta nunca es otra palabra real.
 */
import type { PairGroup } from './spelling.ts';

const g = (regla: string, skill: string, tier: number, explicacion: string, pairs: string): PairGroup => ({ regla, skill, tier, explicacion, pairs });

export const B1_2: PairGroup[] = [
  g('b-v', 'b_v', 1, 'Antes de b y p se escribe m, nunca n.', 'bombilla|bonbilla embudo|enbudo temblar|tenblar ambulancia|anbulancia compañero|conpañero importante|inportante empujar|enpujar campana|canpana trampa|tranpa limpiar|linpiar alfombra|alfonbra'),
  g('b-v', 'b_v', 1, 'Es una palabra que hay que aprender de memoria: se escribe con b.', 'bolsa|volsa botella|votella barba|varba bufanda|vufanda jabón|javón árbitro|árvitro'),
  g('b-v', 'b_v', 1, 'Es una palabra que hay que aprender de memoria: se escribe con v.', 'vecino|becino volcán|bolcán viernes|biernes violín|biolín favor|fabor clavo|clabo nevera|nebera cueva|cueba suave|suabe llover|llober servilleta|serbilleta ventilador|bentilador'),
];

export const B2_2: PairGroup[] = [
  g('g-j', 'g_j', 2, 'Es una palabra que se escribe con g (ge, gi): hay que aprenderla de memoria.', 'agitar|ajitar girar|jirar ingeniero|injeniero colegio|colejio religión|relijión región|rejión vegetal|vejetal'),
  g('g-j', 'g_j', 2, 'Los verbos acabados en -gir se escriben con g.', 'exigir|exijir corregir|correjir surgir|surjir fingir|finjir'),
  g('g-j', 'g_j', 1, 'Es una palabra que se escribe con j: hay que aprenderla de memoria.', 'ajo|ago tijeras|tigeras mejilla|megilla joven|goven naranja|naranga dibujo|dibugo lenteja|lentega consejo|consego espejo|espego'),
  g('g-j', 'g_j', 2, 'Para el sonido «gue», «gui» se escribe gu; si la u suena, lleva diéresis (ü).', 'águila|ágila guepardo|gepardo guiño|giño manguera|mangera hormiguero|hormigero antigüedad|antiguedad lengüeta|lengueta bilingüe|bilingue paragüero|paraguero'),
];

export const B3_2: PairGroup[] = [
  g('h', 'h', 1, 'Las palabras que empiezan por hie-, hue-, hui-, hum-, hip-, hidr- llevan h.', 'hiena|iena huerta|uerta huésped|uésped humano|umano humilde|umilde hipo|ipo hidratar|idratar'),
  g('h', 'h', 1, 'Es una palabra con h que hay que aprender de memoria.', 'huracán|uracán hermana|ermana hongo|ongo horario|orario ahorrar|aorrar deshielo|desielo prohibir|proibir cacahuete|cacauete'),
  g('h', 'h', 2, 'Esta palabra NO lleva h.', 'oso|hoso ombligo|hombligo uña|huña iglesia|higlesia arena|harena olvidar|holvidar ocho|hocho once|honce error|herror'),
];

export const B4_2: PairGroup[] = [
  g('ll-y', 'll_y', 1, 'Las palabras acabadas en -illo, -illa llevan ll.', 'pasillo|pasiyo ovillo|oviyo zapatilla|zapatiya mejilla|mejiya'),
  g('ll-y', 'll_y', 1, 'Es una palabra con ll que hay que aprender de memoria.', 'llama|yama llanura|yanura galleta|gayeta botella|boteya medalla|medaya pantalla|pantaya billete|biyete'),
  g('ll-y', 'll_y', 2, 'Es una palabra con y que hay que aprender de memoria.', 'yegua|llegua proyecto|prollecto reyes|relles suyo|sullo tuyo|tullo mayor|mallor ensayo|ensallo subrayar|subrallar trayecto|trallecto'),
  g('r-rr', 'r_rr', 1, 'Entre vocales, el sonido fuerte de la r se escribe rr.', 'barrer|barer arriba|ariba derramar|deramar barril|baril cerrojo|cerojo autorretrato|autoretrato'),
  g('r-rr', 'r_rr', 2, 'Al principio de palabra y detrás de n, l o s, el sonido fuerte se escribe con una sola r.', 'Israel|Isrrael enredo|enrredo honrar|honrrar radio|rradio regalo|rregalo rojo|rrojo'),
];

export const B5_2: PairGroup[] = [
  g('c-z', 'c_z', 1, 'Delante de e, i se escribe c; delante de a, o, u, z.', 'cocina|cosina ciruela|siruela cepillo|sepillo cesta|sesta doce|dose once|onse trece|trese catorce|catorse quince|quinse azul|asul zapatilla|sapatilla gracias|grasias trozo|troso'),
  g('c-z', 'c_z', 1, 'Esta palabra acaba en -z, no en -s.', 'nuez|nues luz|lus cruz|crus feliz|felis'),
  g('x-s', 'x_s', 2, 'Esta palabra se escribe con x.', 'experimento|esperimento exposición|esposición extintor|estintor sexto|sesto auxilio|ausilio máximo|másimo próximo|prósimo excelente|escelente'),
  g('x-s', 'x_s', 2, 'Esta palabra se escribe con s, no con x.', 'espejo|expejo estatua|extatua espuma|expuma'),
];

/** A15 (segunda tanda). Para -mente, la clase es la del adjetivo. */
export const MENTE_2: string[] = `amablemente:L alegremente:L sencillamente:L cariñosamente:L
  perfectamente:L estupendamente:L increíblemente tímidamente cálidamente pacíficamente
  mágicamente automáticamente genialmente:A normalmente:A especialmente:A actualmente:A
  ferozmente:A velozmente:A cruelmente:A`
  .trim()
  .split(/\s+/);

export const COMPUESTOS_2: string[] = `decimonoveno:L decimocuarto:L vigesimosegundo:L
  sacacorchos:L guardabosques:L cortacésped limpiaparabrisas:L pasamontañas:L
  parachoques:L portaaviones:L rascacielos:L bocacalle:L aguanieve:L boquiabierto:L
  puntiagudo:L agridulce:L sordomudo:L veintiún veintiséis veinticinco:L dieciocho:L
  diecinueve:L sinvergüenza:L malhumorado:L`
  .trim()
  .split(/\s+/);

export const ENCLITICOS_2: string[] = `dilo:L tenlo:L tómalo cógela ábrela ciérrala búscalo
  llámame escúchame ayúdame espérame perdóname despiértate lávate péinate vístete
  quédate márchate olvídalo acuérdate imagínatelo comérselo dármelo decírselo
  ponérselo sentémonos dígaselo cuídate`
  .trim()
  .split(/\s+/);
