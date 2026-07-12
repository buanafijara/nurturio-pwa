import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getToken } from '@mmailaender/convex-better-auth-svelte/sveltekit';
import { getS3Config, presignPut } from '$lib/server/s3';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const token = await getToken(cookies);
  if (!token) throw error(401, 'Unauthorized');

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) throw error(400, 'No file provided');

  const cfg = getS3Config();
  const key = `projects/nurturio/${crypto.randomUUID()}`;
  const putUrl = await presignPut(cfg, key, file.type);

  let s3Response: Response;
  try {
    s3Response = await fetch(putUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: await file.arrayBuffer()
    });
  } catch (e) {
    const cause = e instanceof Error ? (e as NodeJS.ErrnoException).cause ?? (e as NodeJS.ErrnoException).code : e;
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[upload] fetch to S3 failed:', msg, 'cause:', cause, '\nURL:', putUrl.split('?')[0]);
    throw error(502, `S3 network error: ${msg}`);
  }

  if (!s3Response.ok) {
    const msg = await s3Response.text().catch(() => s3Response.statusText);
    console.error('[upload] S3 responded', s3Response.status, ':', msg);
    throw error(502, `S3 upload failed ${s3Response.status}: ${msg}`);
  }

  return json({ key });
};
