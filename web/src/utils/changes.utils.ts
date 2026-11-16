import type { ChangeInfo } from '@raillineage/network/facts.types';
import type { ChangeGroup } from '~/utils/changes.types';
import { decadeHeading } from '~/utils/format.utils';

/**
 * The changes under a heading for each decade, in order; a plan's last, under "Plan".
 *
 * @param changes - The timeline's changes, in order.
 * @returns Each decade with its changes.
 */
export const changesByDecade = (changes: ChangeInfo[]): ChangeGroup[] => {
  const groups: ChangeGroup[] = [];
  for (const change of changes) {
    const decade = decadeHeading(change.time);
    const group = groups.at(-1);
    if (group?.decade === decade) group.changes.push(change);
    else groups.push({ decade, changes: [change] });
  }
  return groups;
};
