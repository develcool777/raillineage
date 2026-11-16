/**
 * What the video page and the recorder both say of a recording, taking nothing of Node's, so the page
 * reads it too (`recording.constants.ts` is the same for its numbers).
 */

/**
 * Where a city's video is, as it is recorded: the page the recorder records, and its setup page frames.
 *
 * @param city - The city, by its id.
 * @returns Its path (`/kyiv/video/preview`).
 */
export const videoPagePathOf = (city: string): string => `/${encodeURIComponent(city)}/video/preview`;

/**
 * Whether a side of the page can be recorded: even, as the video is encoded (each colour sample covers two pixels each way).
 *
 * @param side - The side, pixels.
 * @returns Whether it is even.
 */
export const isEvenSide = (side: number): boolean => side % 2 === 0;

/**
 * A side of the page as it can be recorded: the even one at or below it (`isEvenSide`).
 *
 * @param side - The side, pixels.
 * @returns It, even.
 */
export const evenSideOf = (side: number): number => side - (side % 2);
