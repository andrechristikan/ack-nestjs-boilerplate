import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { AnalyticGeoUtil } from '@modules/analytic/utils/analytic.geo.util';

describe('AnalyticGeoUtil', () => {
    let util: AnalyticGeoUtil;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [AnalyticGeoUtil],
        }).compile();

        util = module.get(AnalyticGeoUtil);
    });

    describe('distanceKm', () => {
        it('returns 0 when both points are the same', () => {
            expect(util.distanceKm(40.7128, -74.006, 40.7128, -74.006)).toBe(0);
        });

        it('returns half the earth circumference for antipodal longitudes at the equator', () => {
            expect(util.distanceKm(0, 0, 0, 180)).toBeCloseTo(20015.1, 1);
        });
    });
});
