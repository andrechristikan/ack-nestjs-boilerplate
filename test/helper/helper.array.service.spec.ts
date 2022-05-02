import { Test } from '@nestjs/testing';
import { BaseModule } from 'src/core/core.module';
import { HelperArrayService } from 'src/utils/helper/service/helper.array.service';

describe('HelperArrayService', () => {
    let helperArrayService: HelperArrayService;
    const arrays = [1, '2', '3', 3, 1, 6, 7, 8];

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [BaseModule],
        }).compile();

        helperArrayService =
            moduleRef.get<HelperArrayService>(HelperArrayService);
    });

    it('should be defined', () => {
        expect(helperArrayService).toBeDefined();
    });

    describe('getLeftByIndex', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperArrayService, 'getLeftByIndex');

            helperArrayService.getLeftByIndex(arrays, 1);
            expect(test).toHaveBeenCalledWith(arrays, 1);
        });

        it('should be success', async () => {
            const result = helperArrayService.getLeftByIndex(arrays, 1);
            jest.spyOn(helperArrayService, 'getLeftByIndex').mockImplementation(
                () => result
            );

            expect(helperArrayService.getLeftByIndex(arrays, 1)).toBe(result);
        });
    });

    describe('getRightByIndex', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperArrayService, 'getRightByIndex');

            helperArrayService.getRightByIndex(arrays, 1);
            expect(test).toHaveBeenCalledWith(arrays, 1);
        });

        it('should be success', async () => {
            const result = helperArrayService.getRightByIndex(arrays, 1);
            jest.spyOn(
                helperArrayService,
                'getRightByIndex'
            ).mockImplementation(() => result);

            expect(helperArrayService.getRightByIndex(arrays, 1)).toBe(result);
        });
    });

    describe('getLeftByLength', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperArrayService, 'getLeftByLength');

            helperArrayService.getLeftByLength(arrays, 1);
            expect(test).toHaveBeenCalledWith(arrays, 1);
        });

        it('should be success', async () => {
            const result = helperArrayService.getLeftByLength(arrays, 1);
            jest.spyOn(
                helperArrayService,
                'getLeftByLength'
            ).mockImplementation(() => result);

            expect(helperArrayService.getLeftByLength(arrays, 1)).toBe(result);
        });
    });

    describe('getRightByLength', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperArrayService, 'getRightByLength');

            helperArrayService.getRightByLength(arrays, 1);
            expect(test).toHaveBeenCalledWith(arrays, 1);
        });

        it('should be success', async () => {
            const result = helperArrayService.getRightByLength(arrays, 1);
            jest.spyOn(
                helperArrayService,
                'getRightByLength'
            ).mockImplementation(() => result);

            expect(helperArrayService.getRightByLength(arrays, 1)).toBe(result);
        });
    });

    describe('getLast', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperArrayService, 'getLast');

            helperArrayService.getLast(arrays);
            expect(test).toHaveBeenCalledWith(arrays);
        });

        it('should be success', async () => {
            const result = helperArrayService.getLast(arrays);
            jest.spyOn(helperArrayService, 'getLast').mockImplementation(
                () => result
            );

            expect(helperArrayService.getLast(arrays)).toBe(result);
        });
    });

    describe('getFirst', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperArrayService, 'getFirst');

            helperArrayService.getFirst(arrays);
            expect(test).toHaveBeenCalledWith(arrays);
        });

        it('should be success', async () => {
            const result = helperArrayService.getFirst(arrays);
            jest.spyOn(helperArrayService, 'getFirst').mockImplementation(
                () => result
            );

            expect(helperArrayService.getFirst(arrays)).toBe(result);
        });
    });

    describe('getFirstIndexByValue', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperArrayService, 'getFirstIndexByValue');

            helperArrayService.getFirstIndexByValue(arrays, 1);
            expect(test).toHaveBeenCalledWith(arrays, 1);
        });

        it('should be success', async () => {
            const result = helperArrayService.getFirstIndexByValue(arrays, 1);
            jest.spyOn(
                helperArrayService,
                'getFirstIndexByValue'
            ).mockImplementation(() => result);

            expect(helperArrayService.getFirstIndexByValue(arrays, 1)).toBe(
                result
            );
        });
    });

    describe('getLastIndexByValue', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperArrayService, 'getLastIndexByValue');

            helperArrayService.getLastIndexByValue(arrays, 1);
            expect(test).toHaveBeenCalledWith(arrays, 1);
        });

        it('should be success', async () => {
            const result = helperArrayService.getLastIndexByValue(arrays, 1);
            jest.spyOn(
                helperArrayService,
                'getLastIndexByValue'
            ).mockImplementation(() => result);

            expect(helperArrayService.getLastIndexByValue(arrays, 1)).toBe(
                result
            );
        });
    });

    describe('removeByValue', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperArrayService, 'removeByValue');

            helperArrayService.removeByValue(arrays, 1);
            expect(test).toHaveBeenCalledWith(arrays, 1);
        });

        it('should be success', async () => {
            const result = helperArrayService.removeByValue(arrays, 1);
            jest.spyOn(helperArrayService, 'removeByValue').mockImplementation(
                () => result
            );

            expect(helperArrayService.removeByValue(arrays, 1)).toBe(result);
        });
    });

    describe('removeLeftByLength', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperArrayService, 'removeLeftByLength');

            helperArrayService.removeLeftByLength(arrays, 1);
            expect(test).toHaveBeenCalledWith(arrays, 1);
        });

        it('should be success', async () => {
            const result = helperArrayService.removeLeftByLength(arrays, 1);
            jest.spyOn(
                helperArrayService,
                'removeLeftByLength'
            ).mockImplementation(() => result);

            expect(helperArrayService.removeLeftByLength(arrays, 1)).toBe(
                result
            );
        });
    });

    describe('removeRightByLength', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperArrayService, 'removeRightByLength');

            helperArrayService.removeRightByLength(arrays, 1);
            expect(test).toHaveBeenCalledWith(arrays, 1);
        });

        it('should be success', async () => {
            const result = helperArrayService.removeRightByLength(arrays, 1);
            jest.spyOn(
                helperArrayService,
                'removeRightByLength'
            ).mockImplementation(() => result);

            expect(helperArrayService.removeRightByLength(arrays, 1)).toBe(
                result
            );
        });
    });

    describe('joinToString', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperArrayService, 'joinToString');

            helperArrayService.joinToString(arrays, ',');
            expect(test).toHaveBeenCalledWith(arrays, ',');
        });

        it('should be success', async () => {
            const result = helperArrayService.joinToString(arrays, ',');
            jest.spyOn(helperArrayService, 'joinToString').mockImplementation(
                () => result
            );

            expect(helperArrayService.joinToString(arrays, ',')).toBe(result);
        });
    });

    describe('reverse', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperArrayService, 'reverse');

            helperArrayService.reverse(arrays);
            expect(test).toHaveBeenCalledWith(arrays);
        });

        it('should be success', async () => {
            const result = helperArrayService.reverse(arrays);
            jest.spyOn(helperArrayService, 'reverse').mockImplementation(
                () => result
            );

            expect(helperArrayService.reverse(arrays)).toBe(result);
        });
    });

    describe('unique', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperArrayService, 'unique');

            helperArrayService.unique(arrays);
            expect(test).toHaveBeenCalledWith(arrays);
        });

        it('should be success', async () => {
            const result = helperArrayService.unique(arrays);
            jest.spyOn(helperArrayService, 'unique').mockImplementation(
                () => result
            );

            expect(helperArrayService.unique(arrays)).toBe(result);
        });
    });

    describe('shuffle', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperArrayService, 'shuffle');

            helperArrayService.shuffle(arrays);
            expect(test).toHaveBeenCalledWith(arrays);
        });

        it('should be success', async () => {
            const result = helperArrayService.shuffle(arrays);
            jest.spyOn(helperArrayService, 'shuffle').mockImplementation(
                () => result
            );

            expect(helperArrayService.shuffle(arrays)).toBe(result);
        });
    });

    describe('merge', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperArrayService, 'merge');

            helperArrayService.merge(arrays, arrays);
            expect(test).toHaveBeenCalledWith(arrays, arrays);
        });

        it('should be success', async () => {
            const result = helperArrayService.merge(arrays, arrays);
            jest.spyOn(helperArrayService, 'merge').mockImplementation(
                () => result
            );

            expect(helperArrayService.merge(arrays, arrays)).toBe(result);
        });
    });

    describe('mergeUnique', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperArrayService, 'mergeUnique');

            helperArrayService.mergeUnique(arrays, arrays);
            expect(test).toHaveBeenCalledWith(arrays, arrays);
        });

        it('should be success', async () => {
            const result = helperArrayService.mergeUnique(arrays, arrays);
            jest.spyOn(helperArrayService, 'mergeUnique').mockImplementation(
                () => result
            );

            expect(helperArrayService.mergeUnique(arrays, arrays)).toBe(result);
        });
    });

    describe('filterNotIncludeByValue', () => {
        it('should be called', async () => {
            const test = jest.spyOn(
                helperArrayService,
                'filterNotIncludeByValue'
            );

            helperArrayService.filterNotIncludeByValue(arrays, 1);
            expect(test).toHaveBeenCalledWith(arrays, 1);
        });

        it('should be success', async () => {
            const result = helperArrayService.filterNotIncludeByValue(
                arrays,
                1
            );
            jest.spyOn(
                helperArrayService,
                'filterNotIncludeByValue'
            ).mockImplementation(() => result);

            expect(helperArrayService.filterNotIncludeByValue(arrays, 1)).toBe(
                result
            );
        });
    });

    describe('filterNotIncludeByArray', () => {
        it('should be called', async () => {
            const test = jest.spyOn(
                helperArrayService,
                'filterNotIncludeByArray'
            );

            helperArrayService.filterNotIncludeByArray(arrays, arrays);
            expect(test).toHaveBeenCalledWith(arrays, arrays);
        });

        it('should be success', async () => {
            const result = helperArrayService.filterNotIncludeByArray(
                arrays,
                arrays
            );
            jest.spyOn(
                helperArrayService,
                'filterNotIncludeByArray'
            ).mockImplementation(() => result);

            expect(
                helperArrayService.filterNotIncludeByArray(arrays, arrays)
            ).toBe(result);
        });
    });

    describe('filterIncludeByArray', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperArrayService, 'filterIncludeByArray');

            helperArrayService.filterIncludeByArray(arrays, arrays);
            expect(test).toHaveBeenCalledWith(arrays, arrays);
        });

        it('should be success', async () => {
            const result = helperArrayService.filterIncludeByArray(
                arrays,
                arrays
            );
            jest.spyOn(
                helperArrayService,
                'filterIncludeByArray'
            ).mockImplementation(() => result);

            expect(
                helperArrayService.filterIncludeByArray(arrays, arrays)
            ).toBe(result);
        });
    });

    describe('equals', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperArrayService, 'equals');

            helperArrayService.equals(arrays, arrays);
            expect(test).toHaveBeenCalledWith(arrays, arrays);
        });

        it('should be success', async () => {
            const result = helperArrayService.equals(arrays, arrays);
            jest.spyOn(helperArrayService, 'equals').mockImplementation(
                () => result
            );

            expect(helperArrayService.equals(arrays, arrays)).toBe(result);
        });
    });

    describe('notEquals', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperArrayService, 'notEquals');

            helperArrayService.notEquals(arrays, arrays);
            expect(test).toHaveBeenCalledWith(arrays, arrays);
        });

        it('should be success', async () => {
            const result = helperArrayService.notEquals(arrays, arrays);
            jest.spyOn(helperArrayService, 'notEquals').mockImplementation(
                () => result
            );

            expect(helperArrayService.notEquals(arrays, arrays)).toBe(result);
        });
    });

    describe('in', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperArrayService, 'in');

            helperArrayService.in(arrays, arrays);
            expect(test).toHaveBeenCalledWith(arrays, arrays);
        });

        it('should be success', async () => {
            const result = helperArrayService.in(arrays, arrays);
            jest.spyOn(helperArrayService, 'in').mockImplementation(
                () => result
            );

            expect(helperArrayService.in(arrays, arrays)).toBe(result);
        });
    });

    describe('notIn', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperArrayService, 'notIn');

            helperArrayService.notIn(arrays, arrays);
            expect(test).toHaveBeenCalledWith(arrays, arrays);
        });

        it('should be success', async () => {
            const result = helperArrayService.notIn(arrays, arrays);
            jest.spyOn(helperArrayService, 'notIn').mockImplementation(
                () => result
            );

            expect(helperArrayService.notIn(arrays, arrays)).toBe(result);
        });
    });

    describe('includes', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperArrayService, 'includes');

            helperArrayService.includes(arrays, 1);
            expect(test).toHaveBeenCalledWith(arrays, 1);
        });

        it('should be success', async () => {
            const result = helperArrayService.includes(arrays, 1);
            jest.spyOn(helperArrayService, 'includes').mockImplementation(
                () => result
            );

            expect(helperArrayService.includes(arrays, 1)).toBe(result);
        });
    });
});
