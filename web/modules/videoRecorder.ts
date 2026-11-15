import { RecordingJobs } from '@raillineage/video/jobs.service';
import { requestOf } from '@raillineage/video/jobs.utils';
import { defineEventHandler, getRequestHeader, readBody, sendStream, setResponseHeaders, setResponseStatus, type H3Event } from 'h3';
import { addDevServerHandler, defineNuxtModule } from 'nuxt/kit';
import { RECORD_ROUTE } from '../src/features/video/record/record.constants';

/**
 * Answers a request the recorder cannot do, saying why.
 *
 * @param event - The request.
 * @param code - The HTTP status.
 * @param error - Why.
 * @returns The answer's body.
 */
const refuse = (event: H3Event, code: number, error: string): { error: string } => {
  setResponseStatus(event, code);
  return { error };
};

/**
 * Sends a video made, or the part of it a player asks for, so it plays from anywhere in it.
 *
 * @param event - The request.
 * @param jobs - The recordings.
 * @param name - The video's name.
 * @returns What is sent.
 */
const serveVideo = (event: H3Event, jobs: RecordingJobs, name: string): Promise<void> | { error: string } => {
  const video = jobs.read(name, getRequestHeader(event, 'range'));
  if (!video) return refuse(event, 404, `no video ${name}`);
  setResponseHeaders(event, { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
  if (video.range) {
    setResponseStatus(event, 206);
    setResponseHeaders(event, { 'Content-Range': `bytes ${video.range.start}-${video.range.end}/${video.size}` });
  }
  setResponseHeaders(event, { 'Content-Length': String(video.range ? video.range.end - video.range.start + 1 : video.size) });
  return sendStream(event, video.stream);
};

/**
 * The video page's recorder, under `pnpm dev` only, as the video pages are: at `RECORD_ROUTE`, `GET` how
 * it goes, `POST` a video to record, `DELETE` to stop it, and `GET /videos/<name>` a video made. It only
 * carries requests to `@raillineage/video`'s `RecordingJobs`, which runs the recordings: a recording is
 * a process of its own, so a restart of the dev server stops none. The built site has none of it.
 */
export default defineNuxtModule({
  meta: { name: 'video-recorder' },
  setup: (_options, nuxt) => {
    if (!nuxt.options.dev) return;
    const jobs = new RecordingJobs();
    addDevServerHandler({
      route: RECORD_ROUTE,
      handler: defineEventHandler(async event => {
        // Mounted at the route, the path is what follows it.
        const [path = '/'] = event.path.split('?', 1);
        if (path.startsWith('/videos/') && event.method === 'GET') return serveVideo(event, jobs, decodeURIComponent(path.slice('/videos/'.length)));
        if (path !== '/' && path !== '') return refuse(event, 404, 'nothing here');
        try {
          if (event.method === 'GET') return jobs.state();
          if (event.method === 'POST') return jobs.start(requestOf(await readBody(event)));
          if (event.method === 'DELETE') return jobs.cancel();
          return refuse(event, 405, 'GET, POST or DELETE');
        } catch (error) {
          return refuse(event, 400, error instanceof Error ? error.message : String(error));
        }
      }),
    });
  },
});
