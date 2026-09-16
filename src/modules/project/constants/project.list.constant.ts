export const ProjectDefaultAvailableSearch = ['name'];
export const ProjectDefaultAvailableOrderBy = ['createdAt', 'name'];

/** Cursor-route allow-list: every field here is immutable, and a sort key that moves makes a scroll skip and repeat rows. */
export const ProjectCursorAvailableOrderBy = ['createdAt'];

/**
 * Cursor-route allow-list. `joinedAt` is set by the schema default and no repository rewrites it,
 * so the key cannot move a row mid-scroll.
 */
export const ProjectMemberDefaultAvailableOrderBy = ['joinedAt'];
