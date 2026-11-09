import type { Sym } from '../../core/types';

/* eslint-disable react/require-default-props */
interface StackProps {
  number: number;
  elements?: Sym[];
  /** Minimum number of cells drawn, so an empty stack is still visible. */
  minCells?: number;
}

/**
 * One stack. The model keeps the top of the stack at the *end* of the array,
 * while the panel is drawn top-down — so the cells are reversed here. The old
 * version drew them in storage order and marked the bottom cell as the head,
 * which showed every stack upside down.
 */
export default function Stack({
  number,
  elements = [],
  minCells = 3,
}: StackProps) {
  const cells: (Sym | '')[] = [...elements].reverse();
  while (cells.length < minCells) cells.push('');

  return (
    <div className="stack">
      <h3>#{number}</h3>
      <div className="stackBody">
        {cells.map((e, i) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            className={i === 0 && elements.length > 0 ? 'stackHead' : ''}
          >
            {e}
          </div>
        ))}
      </div>
    </div>
  );
}
