import { COVERAGE_DISTANCES } from '@raillineage/network/coverage.constants';
import { formatWalk } from '~/utils/format.utils';

/** The distances coverage may count within, as the Coverage section's switch offers them. */
export const COVERAGE_DISTANCE_ITEMS = COVERAGE_DISTANCES.map(metres => ({ label: formatWalk(metres), value: metres }));
