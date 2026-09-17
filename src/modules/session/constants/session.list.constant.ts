/**
 * Sort fields the admin offset session list accepts.
 * @public
 */
export const SessionDefaultAvailableOrderBy = ['createdAt', 'updatedAt'];

/**
 * Cursor-route allow-list: every field here is immutable, and a sort key that moves makes a scroll skip and repeat rows.
 * @public
 */
export const SessionCursorAvailableOrderBy = ['createdAt'];
