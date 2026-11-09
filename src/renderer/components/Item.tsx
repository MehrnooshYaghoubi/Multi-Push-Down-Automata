import Latex from 'react-latex-next';

/* eslint-disable react/require-default-props, react/no-array-index-key */
interface ItemProps {
  name: string;
  /** Either a ready LaTeX string, or a list rendered as a set. */
  value: string | string[];
  latex: string;
  active?: boolean;
}

/** One row of the "machine definition" panel. */
export default function Item({ name, value, latex, active }: ItemProps) {
  const isList = Array.isArray(value);
  return (
    <div className={active ? 'var active-var' : 'var'}>
      <div className="varInfo">
        <h4>{name}</h4>
        <span className="value">
          {isList ? (
            <>
              <Latex>{'$\\{$'}</Latex>
              {value.length === 0 && <Latex>{'$\\varnothing$'}</Latex>}
              {value.slice(0, 8).map((e, i) => (
                <Latex key={`${e}-${i}`}>
                  ${e} {i + 1 === value.length ? '' : ',\\:'}$
                </Latex>
              ))}
              {value.length > 8 && <>...</>}
              <Latex>{'$\\}$'}</Latex>
            </>
          ) : (
            <Latex>{value}</Latex>
          )}
        </span>
      </div>
      <span className="icon">
        <Latex>{latex}</Latex>
      </span>
    </div>
  );
}
