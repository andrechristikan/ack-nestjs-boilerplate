/**
 * Cursor-route allow-list. `country` is seeded reference data reached through a single read-only
 * public controller, so no runtime path rewrites `name` or `alpha2Code` and neither key moves mid-scroll.
 * @public
 */
export const CountryDefaultAvailableOrderBy = ['name', 'alpha2Code'];

/**
 * Fields the public country list searches.
 * @public
 */
export const CountryDefaultAvailableSearch = [
    'name',
    'alpha2Code',
    'alpha3Code',
    'continent',
];
