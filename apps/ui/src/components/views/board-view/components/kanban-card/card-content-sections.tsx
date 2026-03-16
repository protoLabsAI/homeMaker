import { memo } from 'react';
import { Feature } from '@/store/types';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface CardContentSectionsProps {
  feature: Feature;
  useWorktrees: boolean;
}

export const CardContentSections = memo(function CardContentSections({
  feature: _feature,
  useWorktrees: _useWorktrees,
}: CardContentSectionsProps) {
  // Branch name and PR URL are dev-specific and not relevant for home project management.
  // Home context (category, cost, due date) is shown via CardBadges.
  return null;
});
