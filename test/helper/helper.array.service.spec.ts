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
            const testArray = [
                ['a', 'b', 'c'],
                [1, 2],
            ];
            const result = service.getCombinations<string | number>(testArray);
            expect(result).toEqual([
                ['a', 1],
                ['a', 2],
                ['b', 1],
                ['b', 2],
                ['c', 1],
                ['c', 2],
            ]);
        });
    });

    describe('getLast', () => {
        it('should return value of last array', () => {
            const testArray = ['a', 'b', 'c', 'd'];
            const result = service.getLast(testArray);
            expect(result).toEqual('d');
        });
    });

    describe('getFirst', () => {
        it('should return value of first array', () => {
            const testArray = ['a', 'b', 'c', 'd'];
            const result = service.getFirst(testArray);
            expect(result).toEqual('a');
        });
    });

    describe('getFirstByIndex', () => {
        it('should return value of array by index, from first', () => {
            const testArray = ['a', 'b', 'c', 'd'];
            const result = service.getFirstByIndex(testArray, 2);
            expect(result).toEqual('c');
        });
    });

    describe('getLastByIndex', () => {
        it('should return value of array by index, from last', () => {
            const testArray = ['a', 'b', 'c', 'd'];
            const result = service.getLastByIndex(testArray, 2);
            expect(result).toEqual('c');
        });
    });

    describe('takeFirst', () => {
        it('should return array, get from first', () => {
            const testArray = ['a', 'b', 'c', 'd'];
            const result = service.takeFirst(testArray, 2);
            expect(result).toEqual(['a', 'b']);
        });
    });

    describe('takeLast', () => {
        it('should return array, get from last', () => {
            const testArray = ['a', 'b', 'c', 'd'];
            const result = service.takeLast(testArray, 2);
            expect(result).toEqual(['c', 'd']);
        });
    });

    describe('indexOf', () => {
        it('should return index of variable', () => {
            const testArray = ['a', 'b', 'c', 'd', 'c'];
            const result = service.indexOf(testArray, 'c');
            expect(result).toEqual(2);
        });
    });

    describe('lastIndexOf', () => {
        it('should return last index of variable', () => {
            const testArray = ['a', 'b', 'c', 'd', 'c'];
            const result = service.lastIndexOf(testArray, 'c');
            expect(result).toEqual(4);
        });
    });

    describe('remove', () => {
        it('should return removed array', () => {
            const testArray = ['a', 'b', 'c', 'd'];
            const result: string[] = service.remove(testArray, 'c');
            expect(result).toEqual(['c']);
        });
    });

    describe('removeFromLeft', () => {
        it('should remove array element from left', () => {
            const testArray = ['a', 'b', 'c', 'd'];
            const result = service.removeFromLeft(testArray, 2);
            expect(result).toEqual(['c', 'd']);
        });
    });

    describe('removeFromRight', () => {
        it('should remove array element from right', () => {
            const testArray = ['a', 'b', 'c', 'd'];
            const result = service.removeFromRight(testArray, 2);
            expect(result).toEqual(['a', 'b']);
        });
    });

    describe('join', () => {
        it('should return string value of array', () => {
            const testArray = ['a', 'b', 'c', 'd'];
            const delimiter = ',';
            const result = service.join(testArray, delimiter);
            expect(result).toEqual('a,b,c,d');
        });
    });

    describe('split', () => {
        it('should return array value from string', () => {
            const testArray = 'a,b,c,d';
            const delimiter = ',';
            const result = service.split(testArray, delimiter);
            expect(result).toEqual(['a', 'b', 'c', 'd']);
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
    describe('intersection', () => {
        it('should return intersection between array', () => {
            const a = [1, 2, 3];
            const b = [4, 3, 6];
            const result = service.intersection(a, b);
            expect(result).toEqual([3]);
        });
    });

    describe('difference', () => {
        it('should return difference between array', () => {
            const a = [1, 2, 3];
            const b = [4, 5, 6];
            const result = service.difference(a, b);
            expect(result).toEqual([1, 2, 3]);
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
