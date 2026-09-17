/**
 * Sort fields the admin offset password-history list accepts.
 * @public
 */
export const PasswordHistoryDefaultAvailableOrderBy = [
    'createdAt',
    'expiredAt',
];

/**
 * Cursor-route allow-list: every field here is immutable, and a sort key that moves makes a scroll skip and repeat rows.
 * @public
 */
export const PasswordHistoryCursorAvailableOrderBy = ['createdAt'];
