import { Test } from '@nestjs/testing';
import { HelperArrayService } from 'src/common/helper/services/helper.array.service';
import _ from 'lodash';

jest.mock('lodash', () => ({
    take: jest.fn(),
    takeRight: jest.fn(),
    difference: jest.fn(),
    intersection: jest.fn(),
    concat: jest.fn(),
    union: jest.fn(),
    uniq: jest.fn(),
    shuffle: jest.fn(),
    isEqual: jest.fn(),
    chunk: jest.fn(),
}));

describe('HelperArrayService', () => {
    let service: HelperArrayService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [HelperArrayService],
        }).compile();

        service = moduleRef.get<HelperArrayService>(HelperArrayService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getFromLeft', () => {
        it('should return left part of array', () => {
            const input = [1, 2, 3, 4, 5];
            const length = 3;
            const result = [1, 2, 3];

            jest.spyOn(_, 'take').mockImplementation(() => result);
            expect(service.getFromLeft(input, length)).toEqual(result);
            expect(_.take(input, length)).toEqual(result);
        });

        it('should return entire array if length is greater than array length', () => {
            const array = [1, 2, 3];
            const length = 5;

            jest.spyOn(_, 'take').mockImplementation(() => array);
            expect(service.getFromLeft(array, length)).toEqual(array);
        });

        it('should return empty array if length is zero', () => {
            const array = [1, 2, 3];
            const length = 0;
            const result = [];

            jest.spyOn(_, 'take').mockImplementation(() => result);
            expect(service.getFromLeft(array, length)).toEqual(result);
        });
    });

    describe('getFromRight', () => {
        it('should return right part of array', () => {
            const input = [1, 2, 3, 4, 5];
            const length = 2;
            const result = [4, 5];

            jest.spyOn(_, 'takeRight').mockImplementation(() => result);
            expect(service.getFromRight(input, length)).toEqual(result);
        });
    });

    describe('getDifference', () => {
        it('should return difference of array', () => {
            const a1 = [1, 2, 3];
            const a2 = [3, 4, 5];
            const result = [1, 2];

            jest.spyOn(_, 'difference').mockImplementation(() => result);
            expect(service.getDifference(a1, a2)).toEqual(result);
        });
    });

    describe('getIntersection', () => {
        it('should return intersection of array', () => {
            const a1 = [1, 2, 3];
            const a2 = [3, 4, 5];
            const result = [3];

            jest.spyOn(_, 'intersection').mockImplementation(() => result);
            expect(service.getIntersection(a1, a2)).toEqual(result);
        });
    });

    describe('concat', () => {
        it('should return concat of array', () => {
            const a1 = [1, 2, 3];
            const a2 = [3, 4, 5];
            const result = [1, 2, 3, 3, 4, 5];

            jest.spyOn(_, 'concat').mockImplementation(() => result);
            expect(service.concat(a1, a2)).toEqual(result);
        });
    });

    describe('concatUnique', () => {
        it('should return concat unique of array', () => {
            const a1 = [1, 2, 3];
            const a2 = [3, 4, 5];
            const result = [1, 2, 3, 4, 5];

            jest.spyOn(_, 'union').mockImplementation(() => result);
            expect(service.concatUnique(a1, a2)).toEqual(result);
        });
    });

    describe('unique', () => {
        it('should return unique of array', () => {
            const a1 = [1, 2, 3, 3, 2, 1];
            const result = [1, 2, 3];

            jest.spyOn(_, 'uniq').mockImplementation(() => result);
            expect(service.unique(a1)).toEqual(result);
        });
    });

    describe('shuffle', () => {
        it('should return shuffle of array', () => {
            const a1 = [1, 2, 3];
            const result = [2, 1, 3];

            jest.spyOn(_, 'shuffle').mockImplementation(() => result);
            expect(service.shuffle(a1)).toEqual(result);
        });
    });

    describe('equals true', () => {
        it('should return equals true of array', () => {
            const a1 = [1, 2, 3];
            const a2 = [1, 2, 3];
            const result = true;

            jest.spyOn(_, 'isEqual').mockImplementation(() => result);
            expect(service.equals(a1, a2)).toBe(result);
        });
    });

    describe('equals false', () => {
        it('should return equals false of array', () => {
            const a1 = [1, 2, 3];
            const a2 = [2, 3, 4];
            const result = false;

            jest.spyOn(_, 'isEqual').mockImplementation(() => result);
            expect(service.equals(a1, a2)).toBe(result);
        });
    });

    describe('notEquals true', () => {
        it('should return not equals true of array', () => {
            const a1 = [1, 2, 3];
            const a2 = [2, 3, 4];
            const result = true;

            jest.spyOn(_, 'isEqual').mockImplementation(() => false);
            expect(service.notEquals(a1, a2)).toBe(result);
        });
    });

    describe('notEquals false', () => {
        it('should return not equals false of array', () => {
            const a1 = [1, 2, 3];
            const a2 = [1, 2, 3];
            const result = false;

            jest.spyOn(_, 'isEqual').mockImplementation(() => true);
            expect(service.notEquals(a1, a2)).toBe(result);
        });
    });

    describe('in true', () => {
        it('should return in true of array', () => {
            const a1 = [1, 2, 3];
            const a2 = [3, 4, 5];
            const result = true;

            jest.spyOn(_, 'intersection').mockImplementation(() => [3]);
            expect(service.in(a1, a2)).toBe(result);
        });
    });

    describe('in false', () => {
        it('should return in false of array', () => {
            const a1 = [1, 2, 3];
            const a2 = [4, 5];
            const result = false;

            jest.spyOn(_, 'intersection').mockImplementation(() => []);
            expect(service.in(a1, a2)).toBe(result);
        });
    });

    describe('notIn false', () => {
        it('should return not in false of array', () => {
            const a1 = [1, 2, 3];
            const a2 = [3, 4, 5];
            const result = false;

            jest.spyOn(_, 'intersection').mockImplementation(() => [3]);
            expect(service.notIn(a1, a2)).toBe(result);
        });
    });

    describe('notIn true', () => {
        it('should return not in true of array', () => {
            const a1 = [1, 2, 3];
            const a2 = [4, 5];
            const result = true;

            jest.spyOn(_, 'intersection').mockImplementation(() => []);
            expect(service.notIn(a1, a2)).toBe(result);
        });
    });

    describe('chunk', () => {
        it('should chunk array', () => {
            const input = [1, 2, 3];
            const result = [[1, 2, 3]];

            jest.spyOn(_, 'chunk').mockImplementation(() => result);
            expect(service.chunk(input, 3)).toBe(result);
        });
    });
});
