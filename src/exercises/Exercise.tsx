import { useState, useEffect } from 'react';
import type { Item } from '../core/content/schema';
import type { AnswerValue } from '../core/engine/grade';
import { stripAccents, isVowel } from '../core/phonology/phonology';

export interface ExerciseProps {
  item: Item;
  /** true cuando ya se ha comprobado: no se puede cambiar la respuesta. */
  locked: boolean;
  /** Resultado tras comprobar (para colorear). */
  verdict: 'correct' | 'wrong' | null;
  onChange: (value: AnswerValue | null) => void;
}

/** Palabra grande de la pregunta. */
function BigWord({ children }: { children: React.ReactNode }) {
  return <div className="big-word">{children}</div>;
}

/** Elegir entre opciones (elegir, clasificar, explica_regla, diptongo_hiato, hueco). */
function Choice({ item, locked, verdict, onChange }: ExerciseProps) {
  const [sel, setSel] = useState<string | null>(null);
  const showWord = item.tipo !== 'elegir' && item.palabra && !item.enunciado.includes(item.palabra);
  const wordy = item.tipo === 'elegir';
  return (
    <>
      {showWord && <BigWord>{item.palabra}</BigWord>}
      {item.frase && <p className="sentence">{item.frase}</p>}
      <div className={wordy ? 'options words' : 'options'} role="radiogroup" aria-label="Opciones">
        {item.opciones!.map((o) => {
          let cls = 'option';
          if (sel === o) cls += ' selected';
          if (locked && o === item.respuesta) cls += ' is-correct';
          if (locked && sel === o && verdict === 'wrong') cls += ' is-wrong';
          return (
            <button
              key={o}
              className={cls}
              role="radio"
              aria-checked={sel === o}
              disabled={locked}
              onClick={() => {
                setSel(o);
                onChange(o);
              }}
            >
              {o}
            </button>
          );
        })}
      </div>
    </>
  );
}

/** Poner la tilde: se toca la vocal que la lleva, o "No lleva tilde". */
function PonerTilde({ item, locked, verdict, onChange }: ExerciseProps) {
  const [sel, setSel] = useState<number | null>(null);
  const plain = [...stripAccents(item.palabra!)];
  const map: Record<string, string> = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú' };
  const pick = (i: number) => {
    setSel(i);
    onChange(i);
  };
  return (
    <>
      <div className="letters" role="group" aria-label={`Letras de ${plain.join('')}`}>
        {plain.map((c, i) => {
          const vowel = isVowel(c) && c.toLowerCase() !== 'ü';
          if (!vowel) {
            return (
              <span key={i} className="letter static" aria-hidden="true">
                {c}
              </span>
            );
          }
          let cls = 'letter vowel';
          if (sel === i) cls += ' selected';
          if (locked && i === item.respuesta) cls += ' is-correct';
          if (locked && sel === i && verdict === 'wrong') cls += ' is-wrong';
          const shown = sel === i || (locked && i === item.respuesta) ? (map[c] ?? c) : c;
          return (
            <button key={i} className={cls} disabled={locked} aria-label={`Poner tilde en la ${c}`} aria-pressed={sel === i} onClick={() => pick(i)}>
              {shown}
            </button>
          );
        })}
      </div>
      <button
        className={`option no-accent${sel === -1 ? ' selected' : ''}${locked && item.respuesta === -1 ? ' is-correct' : ''}${
          locked && sel === -1 && verdict === 'wrong' ? ' is-wrong' : ''
        }`}
        disabled={locked}
        aria-pressed={sel === -1}
        onClick={() => pick(-1)}
      >
        No lleva tilde
      </button>
    </>
  );
}

/** Tocar la sílaba tónica. */
function SilabaTonica({ item, locked, verdict, onChange }: ExerciseProps) {
  const [sel, setSel] = useState<number | null>(null);
  return (
    <div className="syllables" role="radiogroup" aria-label="Sílabas">
      {item.opciones!.map((s, i) => {
        let cls = 'syllable';
        if (sel === i) cls += ' selected';
        if (locked && i === item.respuesta) cls += ' is-correct';
        if (locked && sel === i && verdict === 'wrong') cls += ' is-wrong';
        return (
          <button
            key={i}
            className={cls}
            role="radio"
            aria-checked={sel === i}
            disabled={locked}
            onClick={() => {
              setSel(i);
              onChange(i);
            }}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}

/** Separar en sílabas tocando entre letras. */
function Separar({ item, locked, onChange }: ExerciseProps) {
  const [cuts, setCuts] = useState<Set<number>>(new Set());
  const chars = [...item.palabra!];
  const correct = new Set(item.respuesta as number[]);
  useEffect(() => onChange(cuts.size ? [...cuts] : null), [cuts]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (i: number) =>
    setCuts((prev) => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  return (
    <>
      <div className="split-word" role="group" aria-label={`Separa ${item.palabra} en sílabas`}>
        {chars.map((c, i) => (
          <span key={i} className="split-unit">
            {i > 0 && (
              <button
                className={`gap${cuts.has(i) ? ' on' : ''}${locked && correct.has(i) ? ' should' : ''}${
                  locked && cuts.has(i) && !correct.has(i) ? ' bad' : ''
                }`}
                disabled={locked}
                aria-label={`Cortar entre ${chars[i - 1]} y ${c}`}
                aria-pressed={cuts.has(i)}
                onClick={() => toggle(i)}
              >
                <span aria-hidden="true" />
              </button>
            )}
            <span className="split-letter">{c}</span>
          </span>
        ))}
      </div>
      <p className="muted center hint">Toca entre dos letras para poner o quitar un corte.</p>
    </>
  );
}

export function Exercise(props: ExerciseProps) {
  switch (props.item.tipo) {
    case 'poner_tilde':
      return <PonerTilde {...props} />;
    case 'silaba_tonica':
      return (
        <>
          <BigWord>{props.item.palabra}</BigWord>
          <SilabaTonica {...props} />
        </>
      );
    case 'separar':
      return <Separar {...props} />;
    default:
      return <Choice {...props} />;
  }
}
