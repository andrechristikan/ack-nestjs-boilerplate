import { Test, TestingModule } from '@nestjs/testing';
import { HelperArrayService } from 'src/common/helper/services/helper.array.service';
import _ from 'lodash';

describe('HelperArrayService', () => {
    let service: HelperArrayService;

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [HelperArrayService],
        }).compile();

        service = moduleRef.get<HelperArrayService>(HelperArrayService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getCombinations', () => {
        it('should return correct value', () => {
            const result = service.getCombinations<string | number>(
                ['a', 'b', 'c'],
                [1, 2]
            );
            expect(result).toEqual([]);
        });
    });

    describe('getFromLeft', () => {
        it('should return value of array by index, from first', () => {
            const testArray = ['a', 'b', 'c', 'd'];
            const result = service.getFromLeft(testArray, 2);
            expect(result).toEqual(['a', 'b']);
        });
    });

    describe('getFromRight', () => {
        it('should return value of array by index, from last', () => {
            const testArray = ['a', 'b', 'c', 'd'];
            const result = service.getFromRight(testArray, 2);
            expect(result).toEqual(['c', 'd']);
        });
    });

    describe('getDifference', () => {
        it('should return difference between array', () => {
            const a = [1, 2, 3];
            const b = [4, 5, 6];
            const result = service.getDifference(a, b);
            expect(result).toEqual([1, 2, 3]);
        });
    });

    describe('getIntersection', () => {
        it('should return intersection between array', () => {
            const a = [1, 2, 3];
            const b = [4, 3, 6];
            const result = service.getIntersection(a, b);
            expect(result).toEqual([3]);
        });
    });

    describe('concat', () => {
        it('should concat two arrays', () => {
            const a = [1, 2, 3];
            const b = [4, 5, 6];
            const result = service.concat(a, b);
            expect(result).toEqual([1, 2, 3, 4, 5, 6]);
        });
    });

    describe('concatUnique', () => {
        it('should concat two arrays with only unique values', () => {
            const a = [1, 2, 3, 3];
            const b = [3, 4, 5];
            const result = service.concatUnique(a, b);
            expect(result).toEqual([1, 2, 3, 4, 5]);
        });
    });

    describe('unique', () => {
        it('should return unique values from array', () => {
            const testArray = ['a', 'b', 'c', 'c'];
            const result = service.unique(testArray);
            expect(result).toEqual(['a', 'b', 'c']);
        });
    });

    describe('shuffle', () => {
        it('should return shuffled array', () => {
            const testArray = ['a', 'b', 'c', 'd'];
            const result = service.shuffle(testArray);
            expect(result.length).toEqual(testArray.length);
            expect(_.difference(result, testArray)).toHaveLength(0);
        });
    });

    describe('equals', () => {
        it('should return true if two arrays are equal', () => {
            const a = [1, 2, 3];
            const b = [1, 2, 3];
            const result = service.equals(a, b);
            expect(result).toEqual(true);
        });

        it('should return false if two arrays are not equal', () => {
            const a = [1, 2, 3];
            const b = [1, 2, 4];
            const result = service.equals(a, b);
            expect(result).toEqual(false);
        });
    });

    describe('notEquals', () => {
        it('should return false if two arrays are equal', () => {
            const a = [1, 2, 3];
            const b = [1, 2, 3];
            const result = service.notEquals(a, b);
            expect(result).toEqual(false);
        });

        it('should return true if two arrays are not equal', () => {
            const a = [1, 2, 3];
            const b = [1, 2, 4];
            const result = service.notEquals(a, b);
            expect(result).toEqual(true);
        });
    });

    describe('in', () => {
        it('should return true if first array includes any value from second array', () => {
            const a = [1, 2, 3];
            const b = [3, 4, 5];
            const result = service.in(a, b);
            expect(result).toEqual(true);
        });

        it('should return false if first array does not include any value from second array', () => {
            const a = [1, 2, 3];
            const b = [4, 5, 6];
            const result = service.in(a, b);
            expect(result).toEqual(false);
        });
    });

    describe('notIn', () => {
        it('should return true if first array does not include any value from second array', () => {
            const a = [1, 2, 3];
            const b = [4, 5, 6];
            const result = service.notIn(a, b);
            expect(result).toEqual(true);
        });

        it('should return false if first array includes any value from second array', () => {
            const a = [1, 2, 3];
            const b = [3, 4, 5];
            const result = service.notIn(a, b);
            expect(result).toEqual(false);
        });
    });

    describe('chunk', () => {
        it('should return chunks of desired size', () => {
            const a = [1, 2, 3, 4];
            const size = 2;
            const result = service.chunk(a, size);
            expect(result).toEqual([
                [1, 2],
                [3, 4],
            ]);
        });
    });
});
