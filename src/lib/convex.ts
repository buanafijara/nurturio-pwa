// Central re-export so app code imports Convex API via $lib/convex
// instead of fragile relative paths into convex/_generated.
export { api } from '../../convex/_generated/api';
export type { Id, Doc } from '../../convex/_generated/dataModel';
