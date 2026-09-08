export const PasswordHistoryDefaultAvailableOrderBy = ['createdAt', 'expiredAt'];

/** Cursor-route allow-list: every field here is immutable, and a sort key that moves makes a scroll skip and repeat rows. */
export const PasswordHistoryCursorAvailableOrderBy = ['createdAt'];
