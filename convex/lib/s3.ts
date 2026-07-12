// SigV4 presigned URL helpers — Web Crypto only, no Node.js or AWS SDK required.
// Compatible with the Convex V8 runtime.

function toHex(buf: ArrayBuffer): string {
	return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(data: string): Promise<string> {
	return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data)));
}

async function hmac(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
	const k = await crypto.subtle.importKey(
		'raw',
		key,
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	return crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data));
}

// RFC 3986 URI encoding — stricter than encodeURIComponent.
function rfc3986(s: string): string {
	return encodeURIComponent(s).replace(/[!'()*]/g, (c) =>
		'%' + c.charCodeAt(0).toString(16).toUpperCase()
	);
}

export type S3Config = {
	accessKey: string;
	secretKey: string;
	bucket: string;
	region: string;
};

// Throws if any required env var is missing — use in mutations/actions.
export function getS3Config(): S3Config {
	const accessKey = process.env.S3_ACCESS_KEY;
	const secretKey = process.env.S3_SECRET_KEY;
	const bucket = process.env.S3_BUCKET;
	const rawRegion = process.env.S3_REGION;
	if (!accessKey || !secretKey || !bucket || !rawRegion) {
		throw new Error('Missing S3 env vars: S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET, S3_REGION');
	}
	// Strip trailing .linodeobjects.com if the user entered the full cluster domain.
	const region = rawRegion.replace(/\.linodeobjects\.com$/, '');
	return { accessKey, secretKey, bucket, region };
}

// Returns a relative URL that the SvelteKit /api/photo endpoint will sign and redirect.
// Works regardless of whether the S3 bucket is public — reading is always authenticated.
export function publicUrl(key: string): string | null {
	if (!process.env.S3_BUCKET) return null;
	const encodedKey = encodeURIComponent(key);
	return `/api/photo?key=${encodedKey}`;
}

// Generates a presigned S3 PUT URL. The upload request must include:
//   Content-Type: <contentType>
export async function presignPut(
	cfg: S3Config,
	key: string,
	contentType: string,
	expiresIn = 3600
): Promise<string> {
	const { accessKey, secretKey, bucket, region } = cfg;

	const now = new Date();
	const pad = (n: number) => n.toString().padStart(2, '0');
	const dateStamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}`;
	const amzDate = `${dateStamp}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

	const host = `${bucket}.${region}.linodeobjects.com`;
	const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
	// Signed headers must be sorted and lowercase.
	const signedHeaders = 'content-type;host';

	const queryParts: [string, string][] = [
		['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
		['X-Amz-Credential', `${accessKey}/${credentialScope}`],
		['X-Amz-Date', amzDate],
		['X-Amz-Expires', String(expiresIn)],
		['X-Amz-SignedHeaders', signedHeaders]
	];
	queryParts.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

	const canonicalQueryString = queryParts.map(([k, v]) => `${rfc3986(k)}=${rfc3986(v)}`).join('&');

	// Canonical headers: lowercase name, trimmed value, sorted, each ending with \n.
	const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;

	const encodedKey = key.split('/').map(rfc3986).join('/');

	const canonicalRequest = [
		'PUT',
		`/${encodedKey}`,
		canonicalQueryString,
		canonicalHeaders,
		signedHeaders,
		'UNSIGNED-PAYLOAD'
	].join('\n');

	const stringToSign = [
		'AWS4-HMAC-SHA256',
		amzDate,
		credentialScope,
		await sha256(canonicalRequest)
	].join('\n');

	// Derive the signing key via four rounds of HMAC.
	let signingKey: ArrayBuffer = new TextEncoder().encode('AWS4' + secretKey).buffer as ArrayBuffer;
	signingKey = await hmac(signingKey, dateStamp);
	signingKey = await hmac(signingKey, region);
	signingKey = await hmac(signingKey, 's3');
	signingKey = await hmac(signingKey, 'aws4_request');

	const signature = toHex(await hmac(signingKey, stringToSign));

	return `https://${host}/${encodedKey}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}
