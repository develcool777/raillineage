/**
 * A video's size, as its setup offers it: the page's size as it lays out, and the pixels drawn for each
 * of the page's, each way (2 for 4K from a 1080p page, as a Retina screen); the video is the one times the other.
 */
export type RecordSize = { label: string; width: number; height: number; scale: number };
