import { describe, expect, it } from 'vitest';

import { AnalyticGeoUtil } from '@modules/analytic/utils/analytic.geo.util';

describe('AnalyticGeoUtil', () => {
    const util = new AnalyticGeoUtil();

    it('returns zero for identical coordinates', () => {
        expect(util.distanceKm(41.9028, 12.4964, 41.9028, 12.4964)).toBe(0);
    });

    it('calculates the approximate distance between Rome and Paris', () => {
        expect(util.distanceKm(41.9028, 12.4964, 48.8566, 2.3522)).toBeCloseTo(
            1105,
            -1
        );
    });
});
