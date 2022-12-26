import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { HelperModule } from 'src/common/helper/helper.module';
import { IHelperArrayRemove } from 'src/common/helper/interfaces/helper.interface';
import { HelperArrayService } from 'src/common/helper/services/helper.array.service';
import configs from 'src/configs';

describe('HelperArrayService', () => {
    let helperArrayService: HelperArrayService;
    let arrays: (string | number)[];
    let arraysString: string;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    load: configs,
                    isGlobal: true,
                    cache: true,
                    envFilePath: ['.env'],
                    expandVariables: true,
                }),
                HelperModule,
            ],
        }).compile();

        helperArrayService =
            moduleRef.get<HelperArrayService>(HelperArrayService);

        arrays = [1, '2', '3', 3, 1, 6, 7, 8];
        arraysString = '1,2,3,3,1,6,7,8';
    });

    afterEach(async () => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(helperArrayService).toBeDefined();
    });

    describe('getLeftByIndex', () => {
        it('should be return a value by index from left', async () => {
            const result: number | string = helperArrayService.getLeftByIndex<
                number | string
            >(arrays, 1);

            jest.spyOn(
                helperArrayService,
                'getLeftByIndex'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result).toBe(arrays[1]);
        });
    });

    describe('getRightByIndex', () => {
        it('should be return a value by index from right', async () => {
            const result: number | string = helperArrayService.getRightByIndex<
                number | string
            >(arrays, 1);

            jest.spyOn(
                helperArrayService,
                'getRightByIndex'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result).toBe(arrays[arrays.length - 1]);
        });
    });

    describe('getLeftByLength', () => {
        it('should be return a array by 1 length from left', async () => {
            const result: (number | string)[] =
                helperArrayService.getLeftByLength<number | string>(arrays, 1);

            jest.spyOn(
                helperArrayService,
                'getLeftByLength'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result).toEqual([arrays[0]]);
            expect(result[0]).toBe(arrays[0]);
        });

        it('should be return a array by 3 length from left', async () => {
            const result: (number | string)[] =
                helperArrayService.getLeftByLength<number | string>(arrays, 3);

            jest.spyOn(
                helperArrayService,
                'getLeftByLength'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result).toEqual([arrays[0], arrays[1], arrays[2]]);
            expect(result[0]).toBe(arrays[0]);
            expect(result[2]).toBe(arrays[2]);
        });
    });

    describe('getRightByLength', () => {
        it('should be return a array by 1 length from right', async () => {
            const result: (number | string)[] =
                helperArrayService.getRightByLength<number | string>(arrays, 1);

            jest.spyOn(
                helperArrayService,
                'getRightByLength'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result).toEqual([arrays[arrays.length - 1]]);
            expect(result[0]).toBe(arrays[arrays.length - 1]);
        });

        it('should be return a array by 3 length from right', async () => {
            const result: (number | string)[] =
                helperArrayService.getRightByLength<number | string>(arrays, 3);

            jest.spyOn(
                helperArrayService,
                'getRightByLength'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result).toEqual([
                arrays[arrays.length - 3],
                arrays[arrays.length - 2],
                arrays[arrays.length - 1],
            ]);
            expect(result[0]).toBe(arrays[arrays.length - 3]);
            expect(result[2]).toBe(arrays[arrays.length - 1]);
        });
    });

    describe('getLast', () => {
        it('should be return a last data of array', async () => {
            const result: number | string = helperArrayService.getLast<
                number | string
            >(arrays);

            jest.spyOn(helperArrayService, 'getLast').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
            expect(result).toEqual(arrays[arrays.length - 1]);
        });
    });

    describe('getFirst', () => {
        it('should be return a first data of array', async () => {
            const result: number | string = helperArrayService.getFirst<
                number | string
            >(arrays);

            jest.spyOn(helperArrayService, 'getFirst').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
            expect(result).toEqual(arrays[0]);
        });
    });

    describe('getFirstIndexByValue', () => {
        it('should be return a first index with search by value', async () => {
            const result: number = helperArrayService.getFirstIndexByValue<
                number | string
            >(arrays, '2');

            jest.spyOn(
                helperArrayService,
                'getFirstIndexByValue'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result).toEqual(1);
        });
    });

    describe('getLastIndexByValue', () => {
        it('should be return a last index with search by value', async () => {
            const result: number = helperArrayService.getLastIndexByValue<
                number | string
            >(arrays, 1);

            jest.spyOn(
                helperArrayService,
                'getLastIndexByValue'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result).toEqual(4);
        });
    });

    describe('removeByValue', () => {
        it('should remove array by searching a value', async () => {
            const result: IHelperArrayRemove<number | string> =
                helperArrayService.removeByValue<number | string>(arrays, 8);

            jest.spyOn(helperArrayService, 'removeByValue').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
            expect(result.removed).toBeDefined();
            expect(result.arrays).toBeDefined();
            expect(result.removed.length).toEqual(1);
            expect(result.removed.length).toEqual(1);
            expect(result.removed[0]).toEqual(8);
            expect(result.arrays.length).toEqual(7);
            expect(result.arrays[result.arrays.length - 1]).toBe(7);
        });
    });

    describe('removeLeftByLength', () => {
        it('should remove array by length from left', async () => {
            const result: (number | string)[] =
                helperArrayService.removeLeftByLength<number | string>(
                    arrays,
                    1
                );

            jest.spyOn(
                helperArrayService,
                'removeLeftByLength'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result.length).toEqual(arrays.length - 1);
            expect(result[0]).toBe('2');
        });
    });

    describe('removeRightByLength', () => {
        it('should remove array by length from right', async () => {
            const result: (number | string)[] =
                helperArrayService.removeRightByLength<number | string>(
                    arrays,
                    1
                );

            jest.spyOn(
                helperArrayService,
                'removeRightByLength'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result.length).toEqual(arrays.length - 1);
            expect(result[result.length - 1]).toBe(7);
        });
    });

    describe('joinToString', () => {
        it('should join array to string', async () => {
            const result: string = helperArrayService.joinToString<
                number | string
            >(arrays, ',');

            jest.spyOn(helperArrayService, 'joinToString').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
            expect(result).toBe(arraysString);
        });
    });

    describe('reverse', () => {
        it('array should be reversed', async () => {
            const result: (number | string)[] = helperArrayService.reverse<
                number | string
            >(arrays);

            jest.spyOn(helperArrayService, 'reverse').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
            expect(result[0]).toBe(8);
            expect(result[result.length - 1]).toBe(1);
        });
    });

    describe('unique', () => {
        it('array should be unique', async () => {
            const result: (number | string)[] = helperArrayService.unique<
                number | string
            >(arrays);

            jest.spyOn(helperArrayService, 'unique').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
            expect(result.length).toBe(7);
        });
    });

    describe('shuffle', () => {
        it('array should be shuffle', async () => {
            const result: (number | string)[] = helperArrayService.shuffle<
                number | string
            >(arrays);

            jest.spyOn(helperArrayService, 'shuffle').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
            expect(result.length).toBe(arrays.length);
            expect(result.every((val) => arrays.includes(val))).toBe(true);
            expect(result.every((val, idx) => arrays[idx] === val)).toBe(false);
        });
    });

    describe('merge', () => {
        it('array should be merger', async () => {
            const result: (number | string)[] = helperArrayService.merge<
                number | string
            >(arrays, arrays);

            jest.spyOn(helperArrayService, 'merge').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result.length).toBe(arrays.length * 2);
        });
    });

    describe('mergeUnique', () => {
        it('array should be merger and unique array', async () => {
            const result: (number | string)[] = helperArrayService.mergeUnique<
                number | string
            >(arrays, arrays);

            jest.spyOn(helperArrayService, 'mergeUnique').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
            expect(result.length).toBe(7);
        });
    });

    describe('filterIncludeByValue', () => {
        it('should be return filtered value', async () => {
            const result: (number | string)[] =
                helperArrayService.filterIncludeByValue<number | string>(
                    arrays,
                    1
                );

            jest.spyOn(
                helperArrayService,
                'filterIncludeByValue'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result.length).toBe(2);
            expect(result.every((val) => val === 1)).toBe(true);
        });
    });

    describe('filterNotIncludeByValue', () => {
        it('should be return filtered value', async () => {
            const result: (number | string)[] =
                helperArrayService.filterNotIncludeByValue<number | string>(
                    arrays,
                    1
                );

            jest.spyOn(
                helperArrayService,
                'filterNotIncludeByValue'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result.length).toBe(6);
            expect(result.every((val) => val !== 1)).toBe(true);
        });
    });

    describe('filterNotIncludeUniqueByArray', () => {
        it('should be return filtered value', async () => {
            const result: (number | string)[] =
                helperArrayService.filterNotIncludeUniqueByArray<
                    number | string
                >(arrays, [1]);

            jest.spyOn(
                helperArrayService,
                'filterNotIncludeUniqueByArray'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result.length).toBe(6);
            expect(result.every((val) => val !== 1)).toBe(true);
        });
    });

    describe('filterIncludeUniqueByArray', () => {
        it('should be return filtered value', async () => {
            const result: (number | string)[] =
                helperArrayService.filterIncludeUniqueByArray<number | string>(
                    arrays,
                    [1]
                );

            jest.spyOn(
                helperArrayService,
                'filterIncludeUniqueByArray'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result.length).toBe(1);
            expect(result.every((val) => val === 1)).toBe(true);
        });
    });

    describe('equals', () => {
        it('should be equals', async () => {
            const result: boolean = helperArrayService.equals(arrays, arrays);

            jest.spyOn(helperArrayService, 'equals').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });
    });

    describe('notEquals', () => {
        it('should be equals', async () => {
            const result: boolean = helperArrayService.notEquals(
                arrays,
                [1, 2, 3]
            );

            jest.spyOn(helperArrayService, 'notEquals').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });
    });

    describe('in', () => {
        it('value must in arrays', async () => {
            const result: boolean = helperArrayService.in(arrays, [1]);

            jest.spyOn(helperArrayService, 'in').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });
    });

    describe('notIn', () => {
        it('value must not in arrays', async () => {
            const result: boolean = helperArrayService.notIn(arrays, ['z']);

            jest.spyOn(helperArrayService, 'notIn').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });
    });

    describe('includes', () => {
        it('value must includes arrays', async () => {
            const result: boolean = helperArrayService.includes(arrays, 1);

            jest.spyOn(helperArrayService, 'includes').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });
    });

    describe('chunk', () => {
        it('array chunk to be x value', async () => {
            const result: (number | string)[][] = helperArrayService.chunk(
                arrays,
                2
            );

            jest.spyOn(helperArrayService, 'chunk').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result.length).toBe(4);
        });
    });
});
