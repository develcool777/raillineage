import { RecordingJobs } from '@raillineage/video/jobs.service';
import { requestOf } from '@raillineage/video/jobs.utils';
import { defineEventHandler, readBody, setResponseStatus, type H3Event } from 'h3';
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
 * The video page's recorder, under `pnpm dev` only, as the video pages are: at `RECORD_ROUTE`, `GET` how
 * it goes, `POST` a video to record, and `DELETE` to stop it. It only
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
