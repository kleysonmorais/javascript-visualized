import { CONCEPT_CONFIG } from '@/challenges/concepts';
import type { RuntimeConcept } from '@/challenges/types';

interface ConceptBadgeProps {
  concept: RuntimeConcept;
}

export function ConceptBadge({ concept }: ConceptBadgeProps) {
  const config = CONCEPT_CONFIG[concept];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: `${config.color}15`,
        color: config.color,
      }}
    >
      {config.label}
    </span>
  );
}
