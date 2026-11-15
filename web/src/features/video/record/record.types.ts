/** A size of the page a video can be recorded at, as the video page offers it: the video is it times its sharpness. */
export type RecordSize = { label: string; width: number; height: number };

/** A sharpness offered: pixels drawn to each of the page's, each way. */
export type RecordScale = { label: string; scale: number };
