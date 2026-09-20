import { describe, expect, it } from 'vitest';

import { HelperArrayService } from '@common/helper/services/helper.array.service';

describe('HelperArrayService', () => {
    const service = new HelperArrayService();

    it('unique removes duplicates keeping first occurrence order', () => {
        expect(service.unique([3, 1, 3, 2, 1])).toEqual([3, 1, 2]);
    });

    it('shuffle returns a permutation without mutating the input', () => {
        const input = [1, 2, 3, 4, 5];
        const result = service.shuffle(input);

        expect(result).not.toBe(input);
        expect([...result].sort()).toEqual([1, 2, 3, 4, 5]);
        expect(input).toEqual([1, 2, 3, 4, 5]);
    });

    it('chunk splits into groups of the given size', () => {
        expect(service.chunk([1, 2, 3, 4, 5], 2)).toEqual([
            [1, 2],
            [3, 4],
            [5],
        ]);
        expect(service.chunk([], 2)).toEqual([]);
    });

    it('intersection returns the shared elements only', () => {
        expect(service.intersection([1, 2, 3], [2, 3, 4])).toEqual([2, 3]);
        expect(service.intersection([1], [2])).toEqual([]);
    });
});
