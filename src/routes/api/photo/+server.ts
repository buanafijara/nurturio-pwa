import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getS3Config, presignGet } from '$lib/server/s3';

export const GET: RequestHandler = async ({ url }) => {
	const key = url.searchParams.get('key');
	if (!key) throw error(400, 'Missing key');

	const cfg = getS3Config();
	const signedUrl = await presignGet(cfg, key);
	redirect(307, signedUrl);
};
