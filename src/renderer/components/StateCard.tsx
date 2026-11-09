import { forwardRef } from 'react';
import Latex from 'react-latex-next';
import type { Rule, Sym } from '../../core/types';
import { ruleMatches, ruleToLatex, stateToLatex } from '../lib/format';

interface StateCardProps {
  id: number;
  rules: Rule[];
  active: boolean;
  /** Current input symbol and stack tops, used to highlight the live rule. */
  head: Sym;
  tops: Sym[];
}

/** One state card in the right-hand column of the execution screen. */
const StateCard = forwardRef<HTMLDivElement, StateCardProps>(
  ({ id, rules, active, head, tops }, ref) => (
    <div className={active ? 'active-state state' : 'state'} ref={ref}>
      <div className="stateTitle">
        <Latex>{`$${stateToLatex(id)}$`}</Latex>
      </div>
      <div className="rules">
        {rules.map((rule, i) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            className={
              active && ruleMatches(rule, head, tops)
                ? 'rule active-rule'
                : 'rule'
            }
          >
            <Latex>{`$${ruleToLatex(id, rule)}$`}</Latex>
          </div>
        ))}
      </div>
    </div>
  ),
);

StateCard.displayName = 'StateCard';

export default StateCard;
