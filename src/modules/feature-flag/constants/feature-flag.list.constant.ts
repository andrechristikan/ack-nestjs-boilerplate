/**
 * Fields the feature-flag lists search.
 * @public
 */
export const FeatureFlagDefaultAvailableSearch = ['key'];

/**
 * Sort fields the admin offset and system cursor feature-flag lists accept. `createdAt` and `key`
 * are written when the row is seeded and no update path touches either, so neither key moves a
 * row mid-scroll.
 * @public
 */
export const FeatureFlagDefaultAvailableOrderBy = ['createdAt', 'key'];
