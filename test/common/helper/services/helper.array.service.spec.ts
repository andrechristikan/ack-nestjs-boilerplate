import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { HelperArrayService } from '@common/helper/services/helper.array.service';

describe('HelperArrayService', () => {
    let service: HelperArrayService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [HelperArrayService],
        }).compile();

        service = module.get(HelperArrayService);
    });

    describe('unique', () => {
        it('drops a duplicate entry', () => {
            const result = service.unique([1, 2, 2, 3, 1]);

            expect(result).toEqual([1, 2, 3]);
        });
    });

    describe('shuffle', () => {
        it('keeps every element with no addition or loss', () => {
            const input = [1, 2, 3, 4, 5];

            const result = service.shuffle(input);

            expect(result).toHaveLength(input.length);
            expect([...result].sort()).toEqual([...input].sort());
        });
    });

    describe('chunk', () => {
        it('splits the array into groups of the given size', () => {
            const result = service.chunk([1, 2, 3, 4, 5], 2);

            expect(result).toEqual([[1, 2], [3, 4], [5]]);
        });
    });

    describe('intersection', () => {
        it('keeps only the values present in both arrays', () => {
            const result = service.intersection([1, 2, 3], [2, 3, 4]);

            expect(result).toEqual([2, 3]);
        });
    });
});
