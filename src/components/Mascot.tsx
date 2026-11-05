import mascotUrl from '../assets/mascot.svg';

/** Tildín, la mascota. Decorativa salvo que se indique un texto alternativo. */
export function Mascot({ size = 96, label, bob = false }: { size?: number; label?: string; bob?: boolean }) {
  return (
    <img
      src={mascotUrl}
      width={size}
      height={size}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      className={bob ? 'anim-bob' : undefined}
      draggable={false}
    />
  );
}
