/** A network with this many lines or fewer shows every line's stops at first; a bigger one, each folded under its line. */
export const UNFOLDED_LINES = 4;

/** The overview's sections, by the anchor its contents link to. */
export const OVERVIEW_SECTIONS = { overview: 'overview', lines: 'lines', growth: 'growth', changes: 'changes', plans: 'plans' } as const;

/** How far down the screen a section counts as being read, px: below the header, where an anchor lands it (`scroll-mt-20`), and a little more. */
export const READING_LINE_PX = 100;
