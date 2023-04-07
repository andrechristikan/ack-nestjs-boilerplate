import { Test, TestingModule } from '@nestjs/testing';
import { IHelperArrayRemove } from 'src/common/helper/interfaces/helper.interface';
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

    describe('getLeftByIndex', () => {
        it('should return correct value', () => {
            const testArray = ['a', 'b', 'c', 'd'];
            const result = service.getLeftByIndex(testArray, 2);
            expect(result).toEqual('c');
        });
    });

    describe('getRightByIndex', () => {
        it('should return correct value', () => {
            const testArray = ['a', 'b', 'c', 'd'];
            const result = service.getRightByIndex(testArray, 2);
            expect(result).toEqual('c');
        });
    });

    describe('getLeftByLength', () => {
        it('should return correct value', () => {
            const testArray = ['a', 'b', 'c', 'd'];
            const result = service.getLeftByLength(testArray, 2);
            expect(result).toEqual(['a', 'b']);
        });
    });

    describe('getRightByLength', () => {
        it('should return correct value', () => {
            const testArray = ['a', 'b', 'c', 'd'];
            const result = service.getRightByLength(testArray, 2);
            expect(result).toEqual(['c', 'd']);
        });
    });

    describe('getLast', () => {
        it('should return correct value', () => {
            const testArray = ['a', 'b', 'c', 'd'];
            const result = service.getLast(testArray);
            expect(result).toEqual('d');
        });
    });

    describe('getFirst', () => {
        it('should return correct value', () => {
            const testArray = ['a', 'b', 'c', 'd'];
            const result = service.getFirst(testArray);
            expect(result).toEqual('a');
        });
    });

    describe('getFirstIndexByValue', () => {
        it('should return correct value', () => {
            const testArray = ['a', 'b', 'c', 'd', 'c'];
            const result = service.getFirstIndexByValue(testArray, 'c');
            expect(result).toEqual(2);
        });
    });

    describe('getLastIndexByValue', () => {
        it('should return correct value', () => {
            const testArray = ['a', 'b', 'c', 'd', 'c'];
            const result = service.getLastIndexByValue(testArray, 'c');
            expect(result).toEqual(4);
        });
    });

    describe('removeByValue', () => {
        it('should return removed and modified array', () => {
            const testArray = ['a', 'b', 'c', 'd'];
            const result: IHelperArrayRemove<string> = service.removeByValue(
                testArray,
                'c'
            );
            expect(result.removed).toEqual(['c']);
            expect(result.arrays).toEqual(['a', 'b', 'd']);
        });
    });

    describe('removeLeftByLength', () => {
        it('should return correct value', () => {
            const testArray = ['a', 'b', 'c', 'd'];
            const result = service.removeLeftByLength(testArray, 2);
            expect(result).toEqual(['c', 'd']);
        });
    });

    describe('removeRightByLength', () => {
        it('should return correct value', () => {
            const testArray = ['a', 'b', 'c', 'd'];
            const result = service.removeRightByLength(testArray, 2);
            expect(result).toEqual(['a', 'b']);
        });
    });

    describe('joinToString', () => {
        it('should return correct value', () => {
            const testArray = ['a', 'b', 'c', 'd'];
            const delimiter = ',';
            const result = service.joinToString(testArray, delimiter);
            expect(result).toEqual('a,b,c,d');
        });
    });

    describe('reverse', () => {
        it('should return reversed array', () => {
            const testArray = ['a', 'b', 'c', 'd'];
            const result = service.reverse(testArray);
            expect(result).toEqual(['d', 'c', 'b', 'a']);
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

    describe('merge', () => {
        it('should merge two arrays', () => {
            const a = [1, 2, 3];
            const b = [4, 5, 6];
            const result = service.merge(a, b);
            expect(result).toEqual([1, 2, 3, 4, 5, 6]);
        });
    });

    describe('mergeUnique', () => {
        it('should merge two arrays with only unique values', () => {
            const a = [1, 2, 3, 3];
            const b = [3, 4, 5];
            const result = service.mergeUnique(a, b);
            expect(result).toEqual([1, 2, 3, 4, 5]);
        });
    });

    describe('filterIncludeByValue', () => {
        it('should only include values equal to given value in array', () => {
            const a = [1, 2, 3];
            const value = 3;
            const result = service.filterIncludeByValue(a, value);
            expect(result).toEqual([3]);
        });
    });

    describe('filterNotIncludeByValue', () => {
        it('should remove values equal to given value from array', () => {
            const a = [1, 2, 3, 3];
            const value = 3;
            const result = service.filterNotIncludeByValue(a, value);
            expect(result).toEqual([1, 2]);
        });
    });

    describe('filterNotIncludeUniqueByArray', () => {
        it('should filter out common values from two arrays', () => {
            const a = [1, 2, 3, 3];
            const b = [3, 4, 5];
            const result = service.filterNotIncludeUniqueByArray(a, b);
            expect(result).toEqual([1, 2, 4, 5]);
        });
    });

    describe('filterIncludeUniqueByArray', () => {
        it('should filter unique common values from two arrays', () => {
            const a = [1, 2, 3, 3];
            const b = [3, 4, 5];
            const result = service.filterIncludeUniqueByArray(a, b);
            expect(result).toEqual([3]);
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

    describe('includes', () => {
        it('should return true if array includes given value', () => {
            const a = [1, 2, 3];
            const b = 3;
            const result = service.includes(a, b);
            expect(result).toEqual(true);
        });

        it('should return false if array does not include given value', () => {
            const a = [1, 2, 3];
            const b = 4;
            const result = service.includes(a, b);
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
