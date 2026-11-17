import { useState, useEffect, useRef } from 'react';
import type { Item } from '../core/content/schema';
import { alignChars, type AnswerValue } from '../core/engine/grade';
import { speak } from '../audio/tts';
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
  const isGap = !!item.frase?.includes('___');
  const isStatement = item.tipo === 'verdadero_falso';
  const showWord = !isGap && !isStatement && item.tipo !== 'elegir' && item.palabra && !item.enunciado.includes(item.palabra);
  // Opciones cortas (palabras o letras) en grande; frases completas en tamaño normal.
  const wordy = item.opciones!.every((o) => o.length <= 16);
  const [pre, post] = isGap ? (item.frase!.split('___') as [string, string]) : ['', ''];
  const shown = locked ? String(item.respuesta) : sel;
  return (
    <>
      {showWord && <BigWord>{item.palabra}</BigWord>}
      {/* Verdadero o falso (y cualquier otra pregunta con frase sin hueco): se muestra la afirmación */}
      {item.frase && !isGap && <p className="sentence statement">{item.frase}</p>}
      {isGap && (
        <p className={item.palabra ? 'big-word gap-word' : 'sentence'} aria-label={`${pre} hueco ${post}`}>
          {pre}
          <span className={`blank${shown ? ' filled' : ''}${locked ? ' ok' : ''}`}>
            {shown && shown !== 'nada' ? shown : '\u00A0\u00A0\u00A0\u00A0'}
          </span>
          {post}
        </p>
      )}
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
              {o === 'nada' ? 'nada (sin letra)' : o}
            </button>
          );
        })}
      </div>
    </>
  );
}

/** Detectar el error: tocar la palabra mal escrita de la frase. */
function Detectar({ item, locked, verdict, onChange }: ExerciseProps) {
  const [sel, setSel] = useState<number | null>(null);
  return (
    <div className="sentence tokens" role="radiogroup" aria-label="Palabras de la frase">
      {item.opciones!.map((t, i) => {
        let cls = 'token';
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
            {locked && i === item.respuesta ? (
              <>
                <s>{t}</s> {item.correccion}
              </>
            ) : (
              t
            )}
          </button>
        );
      })}
    </div>
  );
}

const ACCENT_KEYS = ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ'];

/** Campo de escritura con barra de vocales acentuadas y corrección carácter a carácter. */
function TypeIn({ target, locked, verdict, onChange, label }: { target: string; locked: boolean; verdict: ExerciseProps['verdict']; onChange: ExerciseProps['onChange']; label: string }) {
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const update = (v: string) => {
    setText(v);
    onChange(v.trim() ? v : null);
  };
  // Inserta la vocal acentuada donde está el cursor (sin depender de la pulsación larga del teclado).
  const insert = (ch: string) => {
    const el = input.current;
    if (!el) return update(text + ch);
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const v = text.slice(0, start) + ch + text.slice(end);
    update(v);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + ch.length, start + ch.length);
    });
  };
  if (locked) {
    return (
      <div className={`dictation-result ${verdict}`} aria-label={`Has escrito ${text}`}>
        {alignChars(text, target).map((c, i) => (
          <span key={i} className={`ch ${c.status}`} title={c.expected}>
            {c.status === 'missing' ? c.expected : c.ch}
          </span>
        ))}
      </div>
    );
  }
  return (
    <>
      <input
        ref={input}
        className="dictation-input"
        type="text"
        value={text}
        onChange={(e) => update(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && input.current?.blur()}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="done"
        aria-label={label}
        placeholder="Escribe aquí…"
      />
      <div className="accent-bar" role="group" aria-label="Letras especiales">
        {ACCENT_KEYS.map((k) => (
          <button key={k} className="accent-key" onPointerDown={(e) => e.preventDefault()} onClick={() => insert(k)}>
            {k}
          </button>
        ))}
      </div>
    </>
  );
}

/** Dictado: se escucha la palabra y se escribe. */
function Dictado({ item, locked, verdict, onChange }: ExerciseProps) {
  const target = String(item.respuesta);
  return (
    <>
      <div className="row center-row">
        <button className="btn secondary listen" onClick={() => speak(target)} aria-label="Escuchar la palabra">
          🔊 Escuchar
        </button>
        <button className="btn ghost small" onClick={() => speak(target, true)} aria-label="Escuchar más despacio">
          🐢 Despacio
        </button>
      </div>
      <TypeIn target={target} locked={locked} verdict={verdict} onChange={onChange} label="Escribe lo que oyes" />
    </>
  );
}

/** Corrige la palabra: se muestra mal escrita y se escribe bien. */
function Corregir({ item, locked, verdict, onChange }: ExerciseProps) {
  return (
    <>
      <div className="big-word wrong-word" aria-label={`Palabra mal escrita: ${item.frase}`}>
        <s>{item.frase}</s>
      </div>
      <TypeIn target={String(item.respuesta)} locked={locked} verdict={verdict} onChange={onChange} label="Escribe la palabra bien escrita" />
    </>
  );
}

/** Ordena las sílabas: se tocan las fichas en orden; tocar una ficha colocada la devuelve. */
function Ordenar({ item, locked, verdict, onChange }: ExerciseProps) {
  const tiles = item.opciones!;
  const [order, setOrder] = useState<number[]>([]);
  const update = (o: number[]) => {
    setOrder(o);
    onChange(o.length === tiles.length ? o.map((i) => tiles[i]).join('') : null);
  };
  return (
    <>
      <div className={`build-area${locked ? (verdict === 'correct' ? ' is-correct' : ' is-wrong') : ''}`} aria-live="polite" aria-label="Palabra formada">
        {order.length === 0 && <span className="muted">Toca las sílabas…</span>}
        {order.map((i, k) => (
          <button key={`${i}-${k}`} className="tile placed" disabled={locked} aria-label={`Quitar ${tiles[i]}`} onClick={() => update(order.filter((_, j) => j !== k))}>
            {tiles[i]}
          </button>
        ))}
      </div>
      <div className="tiles" role="group" aria-label="Sílabas disponibles">
        {tiles.map((t, i) => (
          <button key={i} className="tile" disabled={locked || order.includes(i)} onClick={() => update([...order, i])}>
            {t}
          </button>
        ))}
      </div>
      {locked && verdict === 'wrong' && (
        <p className="center">
          Era: <strong>{item.palabra}</strong>
        </p>
      )}
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
  // Sin cortes también es una respuesta válida (palabras de una sola sílaba: buey, miau…).
  useEffect(() => onChange([...cuts]), [cuts]); // eslint-disable-line react-hooks/exhaustive-deps
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
      <p className="muted center hint">
        Toca entre dos letras para poner o quitar un corte. Si crees que tiene una sola sílaba, no cortes nada y pulsa Comprobar.
      </p>
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
    case 'detectar_error':
      return <Detectar {...props} />;
    case 'dictado':
      return <Dictado {...props} />;
    case 'corregir':
      return <Corregir {...props} />;
    case 'ordenar':
      return <Ordenar {...props} />;
    default:
      return <Choice {...props} />;
  }
}
