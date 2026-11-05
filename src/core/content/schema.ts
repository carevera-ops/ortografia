import { z } from 'zod';

/** Tipos de ejercicio. */
export const ExerciseType = z.enum([
  'elegir',
  'poner_tilde',
  'silaba_tonica',
  'clasificar',
  'separar',
  'hueco',
  'detectar_error',
  'diptongo_hiato',
  'dictado',
  'explica_regla',
]);
export type ExerciseType = z.infer<typeof ExerciseType>;

export const StressClassSchema = z.enum(['aguda', 'llana', 'esdrujula', 'sobresdrujula']);

/**
 * Un ítem del banco de preguntas.
 * - elegir / explica_regla / clasificar / diptongo_hiato / hueco: `opciones` + `respuesta` (texto de la opción correcta).
 * - poner_tilde: `palabra` (bien escrita) + `respuesta` = posición de la letra con tilde (-1 si no lleva).
 * - silaba_tonica: `palabra` + `opciones` (sílabas) + `respuesta` = índice de la sílaba tónica.
 * - separar: `palabra` + `respuesta` = posiciones de corte (índices de letra donde empieza cada sílaba, salvo la 1.ª).
 * - detectar_error: `opciones` = palabras de la frase + `respuesta` = índice de la palabra mal escrita; `correccion` = forma correcta.
 * - dictado: `palabra` (o frase) que se dicta y se escribe.
 */
export const ItemSchema = z
  .object({
    id: z.string().regex(/^[AB]\d{1,2}-\d{4}$/),
    tipo: ExerciseType,
    enunciado: z.string().min(3),
    palabra: z.string().optional(),
    /** Clase acentual de la palabra (para validar las que no llevan tilde). */
    clase: StressClassSchema.optional(),
    /** Frase de contexto (hueco, detectar_error, dictado). */
    frase: z.string().optional(),
    opciones: z.array(z.string()).optional(),
    respuesta: z.union([z.string(), z.number().int(), z.array(z.number().int())]),
    correccion: z.string().optional(),
    dificultad: z.number().int().min(1).max(5),
    skills: z.array(z.string()).min(1),
    explicacion: z.string().min(5),
    regla_id: z.string(),
  })
  .superRefine((it, ctx) => {
    const needOptions: ExerciseType[] = ['elegir', 'explica_regla', 'clasificar', 'diptongo_hiato', 'hueco', 'silaba_tonica', 'detectar_error'];
    if (needOptions.includes(it.tipo)) {
      if (!it.opciones || it.opciones.length < 2) ctx.addIssue({ code: 'custom', message: `${it.id}: faltan opciones` });
      // En sílaba tónica puede haber sílabas repetidas (p. ej. «ma-má»): se responde por índice.
      else if (it.tipo !== 'silaba_tonica' && new Set(it.opciones).size !== it.opciones.length)
        ctx.addIssue({ code: 'custom', message: `${it.id}: opciones repetidas` });
    }
    if (['elegir', 'explica_regla', 'clasificar', 'diptongo_hiato', 'hueco'].includes(it.tipo)) {
      if (typeof it.respuesta !== 'string' || !it.opciones?.includes(it.respuesta))
        ctx.addIssue({ code: 'custom', message: `${it.id}: la respuesta no está entre las opciones` });
    }
    if (['poner_tilde', 'silaba_tonica', 'separar', 'dictado'].includes(it.tipo) && !it.palabra)
      ctx.addIssue({ code: 'custom', message: `${it.id}: falta la palabra` });
    if (it.tipo === 'silaba_tonica' && (typeof it.respuesta !== 'number' || it.respuesta >= (it.opciones?.length ?? 0)))
      ctx.addIssue({ code: 'custom', message: `${it.id}: índice de sílaba tónica fuera de rango` });
    if (it.tipo === 'separar' && !Array.isArray(it.respuesta))
      ctx.addIssue({ code: 'custom', message: `${it.id}: separar necesita posiciones de corte` });
    if (it.tipo === 'poner_tilde' && typeof it.respuesta !== 'number')
      ctx.addIssue({ code: 'custom', message: `${it.id}: poner_tilde necesita una posición` });
    if (it.tipo === 'detectar_error' && (typeof it.respuesta !== 'number' || !it.correccion))
      ctx.addIssue({ code: 'custom', message: `${it.id}: detectar_error necesita índice y corrección` });
  });
export type Item = z.infer<typeof ItemSchema>;

export const UnitFileSchema = z.object({
  unidad: z.string(),
  items: z.array(ItemSchema),
});
export type UnitFile = z.infer<typeof UnitFileSchema>;

export const RuleSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  resumen: z.string(),
  explicacion: z.array(z.string()).min(1),
  ejemplos: z.array(z.string()).min(1),
  contraejemplos: z.array(z.string()).default([]),
  truco: z.string().optional(),
});
export type Rule = z.infer<typeof RuleSchema>;
export const RulesFileSchema = z.object({ reglas: z.array(RuleSchema) });
