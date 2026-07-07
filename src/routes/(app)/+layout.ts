// The authed app is fully client-driven (Convex subscribes client-side);
// skipping SSR avoids double-fetching and auth-token plumbing on the server.
export const ssr = false;
