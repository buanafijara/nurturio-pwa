import type { ConvexClient } from 'convex/browser';
import { api, type Id } from '$lib/convex';

export async function uploadFile(client: ConvexClient, file: File): Promise<Id<'_storage'>> {
	const uploadUrl = await client.mutation(api.babies.generateUploadUrl, {});
	const response = await fetch(uploadUrl, {
		method: 'POST',
		headers: { 'Content-Type': file.type },
		body: file
	});
	if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
	const { storageId } = await response.json();
	return storageId;
}
