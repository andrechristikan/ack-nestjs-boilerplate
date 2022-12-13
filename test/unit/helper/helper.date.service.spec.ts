import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
    ENUM_HELPER_DATE_DIFF,
    ENUM_HELPER_DATE_FORMAT,
} from 'src/common/helper/constants/helper.enum.constant';
import { HelperModule } from 'src/common/helper/helper.module';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import configs from 'src/configs';

describe('HelperDateService', () => {
    let helperDateService: HelperDateService;
    const date1 = new Date();
    const date2 = new Date();

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

        helperDateService = moduleRef.get<HelperDateService>(HelperDateService);
    });

    it('should be defined', () => {
        expect(helperDateService).toBeDefined();
    });

    describe('calculateAge', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'calculateAge');

            helperDateService.calculateAge(date1);
            expect(test).toHaveBeenCalledWith(date1);
        });

        it('should be success', async () => {
            const result = helperDateService.calculateAge(date1);
            jest.spyOn(helperDateService, 'calculateAge').mockImplementation(
                () => result
            );

            expect(helperDateService.calculateAge(date1)).toBe(result);
        });

        it('should be success with options timezone', async () => {
            const result = helperDateService.calculateAge(date1);
            jest.spyOn(helperDateService, 'calculateAge').mockImplementation(
                () => result
            );

            expect(helperDateService.calculateAge(date1)).toBe(result);
        });
    });

    describe('diff', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'diff');

            helperDateService.diff(date1, date2);
            expect(test).toHaveBeenCalledWith(date1, date2);
        });

        it('should be success', async () => {
            const result = helperDateService.diff(date1, date2);
            jest.spyOn(helperDateService, 'diff').mockImplementation(
                () => result
            );

            expect(helperDateService.diff(date1, date2)).toBe(result);
        });

        it('should be success with options timezone', async () => {
            const result = helperDateService.diff(date1, date2);
            jest.spyOn(helperDateService, 'diff').mockImplementation(
                () => result
            );

            expect(helperDateService.diff(date1, date2)).toBe(result);
        });

        it('should be success with options format minutes', async () => {
            const result = helperDateService.diff(date1, date2, {
                format: ENUM_HELPER_DATE_DIFF.MINUTES,
            });
            jest.spyOn(helperDateService, 'diff').mockImplementation(
                () => result
            );

            expect(
                helperDateService.diff(date1, date2, {
                    format: ENUM_HELPER_DATE_DIFF.MINUTES,
                })
            ).toBe(result);
        });

        it('should be success with options format hours', async () => {
            const result = helperDateService.diff(date1, date2, {
                format: ENUM_HELPER_DATE_DIFF.HOURS,
            });
            jest.spyOn(helperDateService, 'diff').mockImplementation(
                () => result
            );

            expect(
                helperDateService.diff(date1, date2, {
                    format: ENUM_HELPER_DATE_DIFF.HOURS,
                })
            ).toBe(result);
        });

        it('should be success with options format days', async () => {
            const result = helperDateService.diff(date1, date2, {
                format: ENUM_HELPER_DATE_DIFF.DAYS,
            });
            jest.spyOn(helperDateService, 'diff').mockImplementation(
                () => result
            );

            expect(
                helperDateService.diff(date1, date2, {
                    format: ENUM_HELPER_DATE_DIFF.DAYS,
                })
            ).toBe(result);
        });

        it('should be success  with options format seconds', async () => {
            const result = helperDateService.diff(date1, date2, {
                format: ENUM_HELPER_DATE_DIFF.SECONDS,
            });
            jest.spyOn(helperDateService, 'diff').mockImplementation(
                () => result
            );

            expect(
                helperDateService.diff(date1, date2, {
                    format: ENUM_HELPER_DATE_DIFF.SECONDS,
                })
            ).toBe(result);
        });

        it('should be success with options format milis', async () => {
            const result = helperDateService.diff(date1, date2, {
                format: ENUM_HELPER_DATE_DIFF.MILIS,
            });
            jest.spyOn(helperDateService, 'diff').mockImplementation(
                () => result
            );

            expect(
                helperDateService.diff(date1, date2, {
                    format: ENUM_HELPER_DATE_DIFF.MILIS,
                })
            ).toBe(result);
        });
    });

    describe('check', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'check');

            helperDateService.check(date1.toISOString());
            expect(test).toHaveBeenCalledWith(date1.toISOString());
        });

        it('should be success', async () => {
            const result = helperDateService.check(date1.toISOString());
            jest.spyOn(helperDateService, 'check').mockImplementation(
                () => result
            );

            expect(helperDateService.check(date1.toISOString())).toBe(result);
        });

        it('should be success with options timezone', async () => {
            const result = helperDateService.check(date1.toISOString());
            jest.spyOn(helperDateService, 'check').mockImplementation(
                () => result
            );

            expect(helperDateService.check(date1.toISOString())).toBe(result);
        });
    });

    describe('checkTimestamp', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'checkTimestamp');

            helperDateService.checkTimestamp(date1.valueOf());
            expect(test).toHaveBeenCalledWith(date1.valueOf());
        });

        it('should be success', async () => {
            const result = helperDateService.checkTimestamp(date1.valueOf());
            jest.spyOn(helperDateService, 'checkTimestamp').mockImplementation(
                () => result
            );

            expect(helperDateService.checkTimestamp(date1.valueOf())).toBe(
                result
            );
        });

        it('should be success with options timezone', async () => {
            const result = helperDateService.checkTimestamp(date1.valueOf());
            jest.spyOn(helperDateService, 'checkTimestamp').mockImplementation(
                () => result
            );

            expect(helperDateService.checkTimestamp(date1.valueOf())).toBe(
                result
            );
        });
    });

    describe('create', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'create');

            helperDateService.create({ date: date1 });
            expect(test).toHaveBeenCalledWith({ date: date1 });
        });

        it('should be success', async () => {
            const result = helperDateService.create();
            jest.spyOn(helperDateService, 'create').mockImplementation(
                () => result
            );

            expect(helperDateService.create()).toBe(result);
        });

        it('should be success with options date', async () => {
            const result = helperDateService.create({ date: date1 });
            jest.spyOn(helperDateService, 'create').mockImplementation(
                () => result
            );

            expect(helperDateService.create({ date: date1 })).toBe(result);
        });

        it('should be success with options date and timezone', async () => {
            const result = helperDateService.create({ date: date1 });
            jest.spyOn(helperDateService, 'create').mockImplementation(
                () => result
            );

            expect(helperDateService.create({ date: date1 })).toBe(result);
        });
    });

    describe('timestamp', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'timestamp');

            helperDateService.timestamp({ date: date1 });
            expect(test).toHaveBeenCalledWith({ date: date1 });
        });

        it('should be success', async () => {
            const result = helperDateService.timestamp();
            jest.spyOn(helperDateService, 'timestamp').mockImplementation(
                () => result
            );

            expect(helperDateService.timestamp()).toBe(result);
        });

        it('should be success with options date', async () => {
            const result = helperDateService.timestamp({ date: date1 });
            jest.spyOn(helperDateService, 'timestamp').mockImplementation(
                () => result
            );

            expect(helperDateService.timestamp({ date: date1 })).toBe(result);
        });

        it('should be success with date and timezone', async () => {
            const result = helperDateService.timestamp({
                date: date1,
            });
            jest.spyOn(helperDateService, 'timestamp').mockImplementation(
                () => result
            );

            expect(helperDateService.timestamp({ date: date1 })).toBe(result);
        });
    });

    describe('format', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'format');

            helperDateService.format(date1);
            expect(test).toHaveBeenCalledWith(date1);
        });

        it('should be success', async () => {
            const result = helperDateService.format(date1);
            jest.spyOn(helperDateService, 'format').mockImplementation(
                () => result
            );

            expect(helperDateService.format(date1)).toBe(result);
        });

        it('should be success with options format', async () => {
            const result = helperDateService.format(date1);
            jest.spyOn(helperDateService, 'format').mockImplementation(
                () => result
            );

            expect(helperDateService.format(date1)).toBe(result);
        });

        it('should be success with options timezone and format', async () => {
            const result = helperDateService.format(date1, {
                format: ENUM_HELPER_DATE_FORMAT.DATE,
            });
            jest.spyOn(helperDateService, 'format').mockImplementation(
                () => result
            );

            expect(
                helperDateService.format(date1, {
                    format: ENUM_HELPER_DATE_FORMAT.DATE,
                })
            ).toBe(result);
        });
    });

    describe('forwardInMilliseconds', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'forwardInMilliseconds');

            helperDateService.forwardInMilliseconds(2);
            expect(test).toHaveBeenCalledWith(2);
        });

        it('should be success', async () => {
            const result = helperDateService.forwardInMilliseconds(2);
            jest.spyOn(
                helperDateService,
                'forwardInMilliseconds'
            ).mockImplementation(() => result);

            expect(helperDateService.forwardInMilliseconds(2)).toBe(result);
        });

        it('should be success with options fromDate', async () => {
            const result = helperDateService.forwardInMilliseconds(2, {
                fromDate: date1,
            });
            jest.spyOn(
                helperDateService,
                'forwardInMilliseconds'
            ).mockImplementation(() => result);

            expect(
                helperDateService.forwardInMilliseconds(2, { fromDate: date1 })
            ).toBe(result);
        });

        it('should be success with options fromDate and timezone', async () => {
            const result = helperDateService.forwardInMilliseconds(2, {
                fromDate: date1,
            });
            jest.spyOn(
                helperDateService,
                'forwardInMilliseconds'
            ).mockImplementation(() => result);

            expect(
                helperDateService.forwardInMilliseconds(2, {
                    fromDate: date1,
                })
            ).toBe(result);
        });
    });

    describe('backwardInMilliseconds', () => {
        it('should be called', async () => {
            const test = jest.spyOn(
                helperDateService,
                'backwardInMilliseconds'
            );

            helperDateService.backwardInMilliseconds(2);
            expect(test).toHaveBeenCalledWith(2);
        });

        it('should be success', async () => {
            const result = helperDateService.backwardInMilliseconds(2);
            jest.spyOn(
                helperDateService,
                'backwardInMilliseconds'
            ).mockImplementation(() => result);

            expect(helperDateService.backwardInMilliseconds(2)).toBe(result);
        });

        it('should be success with options fromDate', async () => {
            const result = helperDateService.backwardInMilliseconds(2, {
                fromDate: date1,
            });
            jest.spyOn(
                helperDateService,
                'backwardInMilliseconds'
            ).mockImplementation(() => result);

            expect(
                helperDateService.backwardInMilliseconds(2, { fromDate: date1 })
            ).toBe(result);
        });

        it('should be success with options fromDate and timezone', async () => {
            const result = helperDateService.backwardInMilliseconds(2, {
                fromDate: date1,
            });
            jest.spyOn(
                helperDateService,
                'backwardInMilliseconds'
            ).mockImplementation(() => result);

            expect(
                helperDateService.backwardInMilliseconds(2, {
                    fromDate: date1,
                })
            ).toBe(result);
        });
    });

    describe('forwardInSeconds', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'forwardInSeconds');

            helperDateService.forwardInSeconds(2);
            expect(test).toHaveBeenCalledWith(2);
        });

        it('should be success', async () => {
            const result = helperDateService.forwardInSeconds(2);
            jest.spyOn(
                helperDateService,
                'forwardInSeconds'
            ).mockImplementation(() => result);

            expect(helperDateService.forwardInSeconds(2)).toBe(result);
        });

        it('should be success with options fromDate', async () => {
            const result = helperDateService.forwardInSeconds(2, {
                fromDate: date1,
            });
            jest.spyOn(
                helperDateService,
                'forwardInSeconds'
            ).mockImplementation(() => result);

            expect(
                helperDateService.forwardInSeconds(2, { fromDate: date1 })
            ).toBe(result);
        });

        it('should be success with options fromDate and timezone', async () => {
            const result = helperDateService.forwardInSeconds(2, {
                fromDate: date1,
            });
            jest.spyOn(
                helperDateService,
                'forwardInSeconds'
            ).mockImplementation(() => result);

            expect(
                helperDateService.forwardInSeconds(2, {
                    fromDate: date1,
                })
            ).toBe(result);
        });
    });

    describe('backwardInSeconds', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'backwardInSeconds');

            helperDateService.backwardInSeconds(2);
            expect(test).toHaveBeenCalledWith(2);
        });

        it('should be success', async () => {
            const result = helperDateService.backwardInSeconds(2);
            jest.spyOn(
                helperDateService,
                'backwardInSeconds'
            ).mockImplementation(() => result);

            expect(helperDateService.backwardInSeconds(2)).toBe(result);
        });

        it('should be success with options fromDate', async () => {
            const result = helperDateService.backwardInSeconds(2, {
                fromDate: date1,
            });
            jest.spyOn(
                helperDateService,
                'backwardInSeconds'
            ).mockImplementation(() => result);

            expect(
                helperDateService.backwardInSeconds(2, { fromDate: date1 })
            ).toBe(result);
        });

        it('should be success with options fromDate and timezone', async () => {
            const result = helperDateService.backwardInSeconds(2, {
                fromDate: date1,
            });
            jest.spyOn(
                helperDateService,
                'backwardInSeconds'
            ).mockImplementation(() => result);

            expect(
                helperDateService.backwardInSeconds(2, {
                    fromDate: date1,
                })
            ).toBe(result);
        });
    });

    describe('forwardInMinutes', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'forwardInMinutes');

            helperDateService.forwardInMinutes(2);
            expect(test).toHaveBeenCalledWith(2);
        });

        it('should be success', async () => {
            const result = helperDateService.forwardInMinutes(2);
            jest.spyOn(
                helperDateService,
                'forwardInMinutes'
            ).mockImplementation(() => result);

            expect(helperDateService.forwardInMinutes(2)).toBe(result);
        });

        it('should be success with options fromDate', async () => {
            const result = helperDateService.forwardInMinutes(2, {
                fromDate: date1,
            });
            jest.spyOn(
                helperDateService,
                'forwardInMinutes'
            ).mockImplementation(() => result);

            expect(
                helperDateService.forwardInMinutes(2, { fromDate: date1 })
            ).toBe(result);
        });

        it('should be success with options fromDate and timezone', async () => {
            const result = helperDateService.forwardInMinutes(2, {
                fromDate: date1,
            });
            jest.spyOn(
                helperDateService,
                'forwardInMinutes'
            ).mockImplementation(() => result);

            expect(
                helperDateService.forwardInMinutes(2, {
                    fromDate: date1,
                })
            ).toBe(result);
        });
    });

    describe('backwardInMinutes', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'backwardInMinutes');

            helperDateService.backwardInMinutes(2);
            expect(test).toHaveBeenCalledWith(2);
        });

        it('should be success', async () => {
            const result = helperDateService.backwardInMinutes(2);
            jest.spyOn(
                helperDateService,
                'backwardInMinutes'
            ).mockImplementation(() => result);

            expect(helperDateService.backwardInMinutes(2)).toBe(result);
        });

        it('should be success with options fromDate', async () => {
            const result = helperDateService.backwardInMinutes(2, {
                fromDate: date1,
            });
            jest.spyOn(
                helperDateService,
                'backwardInMinutes'
            ).mockImplementation(() => result);

            expect(
                helperDateService.backwardInMinutes(2, { fromDate: date1 })
            ).toBe(result);
        });

        it('should be success with options fromDate and timezone', async () => {
            const result = helperDateService.backwardInMinutes(2, {
                fromDate: date1,
            });
            jest.spyOn(
                helperDateService,
                'backwardInMinutes'
            ).mockImplementation(() => result);

            expect(
                helperDateService.backwardInMinutes(2, {
                    fromDate: date1,
                })
            ).toBe(result);
        });
    });

    describe('forwardInHours', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'forwardInHours');

            helperDateService.forwardInHours(2);
            expect(test).toHaveBeenCalledWith(2);
        });

        it('should be success', async () => {
            const result = helperDateService.forwardInHours(2);
            jest.spyOn(helperDateService, 'forwardInHours').mockImplementation(
                () => result
            );

            expect(helperDateService.forwardInHours(2)).toBe(result);
        });

        it('should be success with options fromDate', async () => {
            const result = helperDateService.forwardInHours(2, {
                fromDate: date1,
            });
            jest.spyOn(helperDateService, 'forwardInHours').mockImplementation(
                () => result
            );

            expect(
                helperDateService.forwardInHours(2, { fromDate: date1 })
            ).toBe(result);
        });

        it('should be success with options fromDate and timezone', async () => {
            const result = helperDateService.forwardInHours(2, {
                fromDate: date1,
            });
            jest.spyOn(helperDateService, 'forwardInHours').mockImplementation(
                () => result
            );

            expect(
                helperDateService.forwardInHours(2, {
                    fromDate: date1,
                })
            ).toBe(result);
        });
    });

    describe('backwardInHours', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'backwardInHours');

            helperDateService.backwardInHours(2);
            expect(test).toHaveBeenCalledWith(2);
        });

        it('should be success', async () => {
            const result = helperDateService.backwardInHours(2);
            jest.spyOn(helperDateService, 'backwardInHours').mockImplementation(
                () => result
            );

            expect(helperDateService.backwardInHours(2)).toBe(result);
        });

        it('should be success with options fromDate', async () => {
            const result = helperDateService.backwardInHours(2, {
                fromDate: date1,
            });
            jest.spyOn(helperDateService, 'backwardInHours').mockImplementation(
                () => result
            );

            expect(
                helperDateService.backwardInHours(2, { fromDate: date1 })
            ).toBe(result);
        });

        it('should be success with options fromDate and timezone', async () => {
            const result = helperDateService.backwardInHours(2, {
                fromDate: date1,
            });
            jest.spyOn(helperDateService, 'backwardInHours').mockImplementation(
                () => result
            );

            expect(
                helperDateService.backwardInHours(2, {
                    fromDate: date1,
                })
            ).toBe(result);
        });
    });

    describe('forwardInDays', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'forwardInDays');

            helperDateService.forwardInDays(2);
            expect(test).toHaveBeenCalledWith(2);
        });

        it('should be success', async () => {
            const result = helperDateService.forwardInDays(2);
            jest.spyOn(helperDateService, 'forwardInDays').mockImplementation(
                () => result
            );

            expect(helperDateService.forwardInDays(2)).toBe(result);
        });

        it('should be success with options fromDate', async () => {
            const result = helperDateService.forwardInDays(2, {
                fromDate: date1,
            });
            jest.spyOn(helperDateService, 'forwardInDays').mockImplementation(
                () => result
            );

            expect(
                helperDateService.forwardInDays(2, { fromDate: date1 })
            ).toBe(result);
        });

        it('should be success with options fromDate and timezone', async () => {
            const result = helperDateService.forwardInDays(2, {
                fromDate: date1,
            });
            jest.spyOn(helperDateService, 'forwardInDays').mockImplementation(
                () => result
            );

            expect(
                helperDateService.forwardInDays(2, {
                    fromDate: date1,
                })
            ).toBe(result);
        });
    });

    describe('backwardInDays', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'backwardInDays');

            helperDateService.backwardInDays(2);
            expect(test).toHaveBeenCalledWith(2);
        });

        it('should be success', async () => {
            const result = helperDateService.backwardInDays(2);
            jest.spyOn(helperDateService, 'backwardInDays').mockImplementation(
                () => result
            );

            expect(helperDateService.backwardInDays(2)).toBe(result);
        });

        it('should be success with options fromDate', async () => {
            const result = helperDateService.backwardInDays(2, {
                fromDate: date1,
            });
            jest.spyOn(helperDateService, 'backwardInDays').mockImplementation(
                () => result
            );

            expect(
                helperDateService.backwardInDays(2, { fromDate: date1 })
            ).toBe(result);
        });

        it('should be success with options fromDate and timezone', async () => {
            const result = helperDateService.backwardInDays(2, {
                fromDate: date1,
            });
            jest.spyOn(helperDateService, 'backwardInDays').mockImplementation(
                () => result
            );

            expect(
                helperDateService.backwardInDays(2, {
                    fromDate: date1,
                })
            ).toBe(result);
        });
    });

    describe('forwardInMonths', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'forwardInMonths');

            helperDateService.forwardInMonths(2);
            expect(test).toHaveBeenCalledWith(2);
        });

        it('should be success', async () => {
            const result = helperDateService.forwardInMonths(2);
            jest.spyOn(helperDateService, 'forwardInMonths').mockImplementation(
                () => result
            );

            expect(helperDateService.forwardInMonths(2)).toBe(result);
        });

        it('should be success with options fromDate', async () => {
            const result = helperDateService.forwardInMonths(2, {
                fromDate: date1,
            });
            jest.spyOn(helperDateService, 'forwardInMonths').mockImplementation(
                () => result
            );

            expect(
                helperDateService.forwardInMonths(2, { fromDate: date1 })
            ).toBe(result);
        });

        it('should be success with options fromDate and timezone', async () => {
            const result = helperDateService.forwardInMonths(2, {
                fromDate: date1,
            });
            jest.spyOn(helperDateService, 'forwardInMonths').mockImplementation(
                () => result
            );

            expect(
                helperDateService.forwardInMonths(2, {
                    fromDate: date1,
                })
            ).toBe(result);
        });
    });

    describe('backwardInMonths', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'backwardInMonths');

            helperDateService.backwardInMonths(2);
            expect(test).toHaveBeenCalledWith(2);
        });

        it('should be success', async () => {
            const result = helperDateService.backwardInMonths(2);
            jest.spyOn(
                helperDateService,
                'backwardInMonths'
            ).mockImplementation(() => result);

            expect(helperDateService.backwardInMonths(2)).toBe(result);
        });

        it('should be success with options fromDate', async () => {
            const result = helperDateService.backwardInMonths(2, {
                fromDate: date1,
            });
            jest.spyOn(
                helperDateService,
                'backwardInMonths'
            ).mockImplementation(() => result);

            expect(
                helperDateService.backwardInMonths(2, { fromDate: date1 })
            ).toBe(result);
        });

        it('should be success with options fromDate and timezone', async () => {
            const result = helperDateService.backwardInMonths(2, {
                fromDate: date1,
            });
            jest.spyOn(
                helperDateService,
                'backwardInMonths'
            ).mockImplementation(() => result);

            expect(
                helperDateService.backwardInMonths(2, {
                    fromDate: date1,
                })
            ).toBe(result);
        });
    });

    describe('endOfYear', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'endOfYear');

            helperDateService.endOfYear();
            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const result = helperDateService.endOfYear();
            jest.spyOn(helperDateService, 'endOfYear').mockImplementation(
                () => result
            );

            expect(helperDateService.endOfYear()).toBe(result);
        });

        it('should be success with date', async () => {
            const result = helperDateService.endOfYear(new Date());
            jest.spyOn(helperDateService, 'endOfYear').mockImplementation(
                () => result
            );

            expect(helperDateService.endOfYear(new Date())).toBe(result);
        });

        it('should be success with options timezone', async () => {
            const result = helperDateService.endOfYear(new Date());
            jest.spyOn(helperDateService, 'endOfYear').mockImplementation(
                () => result
            );

            expect(helperDateService.endOfYear(new Date())).toBe(result);
        });
    });

    describe('startOfYear', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'startOfYear');

            helperDateService.startOfYear();
            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const result = helperDateService.startOfYear();
            jest.spyOn(helperDateService, 'startOfYear').mockImplementation(
                () => result
            );

            expect(helperDateService.startOfYear()).toBe(result);
        });

        it('should be success with date', async () => {
            const result = helperDateService.startOfYear(new Date());
            jest.spyOn(helperDateService, 'startOfYear').mockImplementation(
                () => result
            );

            expect(helperDateService.startOfYear(new Date())).toBe(result);
        });

        it('should be success with options timezone', async () => {
            const result = helperDateService.startOfYear(new Date());
            jest.spyOn(helperDateService, 'startOfYear').mockImplementation(
                () => result
            );

            expect(helperDateService.startOfYear(new Date())).toBe(result);
        });
    });

    describe('endOfMonth', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'endOfMonth');

            helperDateService.endOfMonth();
            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const result = helperDateService.endOfMonth();
            jest.spyOn(helperDateService, 'endOfMonth').mockImplementation(
                () => result
            );

            expect(helperDateService.endOfMonth()).toBe(result);
        });

        it('should be success with date', async () => {
            const result = helperDateService.endOfMonth(new Date());
            jest.spyOn(helperDateService, 'endOfMonth').mockImplementation(
                () => result
            );

            expect(helperDateService.endOfMonth(new Date())).toBe(result);
        });

        it('should be success with options timezone', async () => {
            const result = helperDateService.endOfMonth(new Date());
            jest.spyOn(helperDateService, 'endOfMonth').mockImplementation(
                () => result
            );

            expect(helperDateService.endOfMonth(new Date())).toBe(result);
        });
    });

    describe('startOfMonth', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'startOfMonth');

            helperDateService.startOfMonth();
            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const result = helperDateService.startOfMonth();
            jest.spyOn(helperDateService, 'startOfMonth').mockImplementation(
                () => result
            );

            expect(helperDateService.startOfMonth()).toBe(result);
        });

        it('should be success with date', async () => {
            const result = helperDateService.startOfMonth(new Date());
            jest.spyOn(helperDateService, 'startOfMonth').mockImplementation(
                () => result
            );

            expect(helperDateService.startOfMonth(new Date())).toBe(result);
        });

        it('should be success with options timezone', async () => {
            const result = helperDateService.startOfMonth(new Date());
            jest.spyOn(helperDateService, 'startOfMonth').mockImplementation(
                () => result
            );

            expect(helperDateService.startOfMonth(new Date())).toBe(result);
        });
    });

    describe('endOfDay', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'endOfDay');

            helperDateService.endOfDay();
            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const result = helperDateService.endOfDay();
            jest.spyOn(helperDateService, 'endOfDay').mockImplementation(
                () => result
            );

            expect(helperDateService.endOfDay()).toBe(result);
        });

        it('should be success with date', async () => {
            const result = helperDateService.endOfDay(new Date());
            jest.spyOn(helperDateService, 'endOfDay').mockImplementation(
                () => result
            );

            expect(helperDateService.endOfDay(new Date())).toBe(result);
        });

        it('should be success with options timezone', async () => {
            const result = helperDateService.endOfDay(new Date());
            jest.spyOn(helperDateService, 'endOfDay').mockImplementation(
                () => result
            );

            expect(helperDateService.endOfDay(new Date())).toBe(result);
        });
    });

    describe('startOfDay', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'startOfDay');

            helperDateService.startOfDay();
            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const result = helperDateService.startOfDay();
            jest.spyOn(helperDateService, 'startOfDay').mockImplementation(
                () => result
            );

            expect(helperDateService.startOfDay()).toBe(result);
        });

        it('should be success with date', async () => {
            const result = helperDateService.startOfDay(new Date());
            jest.spyOn(helperDateService, 'startOfDay').mockImplementation(
                () => result
            );

            expect(helperDateService.startOfDay(new Date())).toBe(result);
        });

        it('should be success with options timezone', async () => {
            const result = helperDateService.startOfDay(new Date());
            jest.spyOn(helperDateService, 'startOfDay').mockImplementation(
                () => result
            );

            expect(helperDateService.startOfDay(new Date())).toBe(result);
        });
    });

    describe('extractDate', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'extractDate');

            helperDateService.extractDate(date1);
            expect(test).toHaveBeenCalledWith(date1);
        });

        it('should be success', async () => {
            const result = helperDateService.extractDate(date1);
            jest.spyOn(helperDateService, 'extractDate').mockImplementation(
                () => result
            );

            expect(helperDateService.extractDate(date1)).toBe(result);
        });
    });

    describe('roundDown', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'roundDown');

            helperDateService.roundDown(date1);
            expect(test).toHaveBeenCalledWith(date1);
        });

        it('should be success', async () => {
            const result = helperDateService.roundDown(date1);
            jest.spyOn(helperDateService, 'roundDown').mockImplementation(
                () => result
            );

            expect(helperDateService.roundDown(date1)).toBe(result);
        });

        it('should be success with options hour', async () => {
            const result = helperDateService.roundDown(date1, {
                hour: true,
                minute: false,
                second: false,
            });
            jest.spyOn(helperDateService, 'roundDown').mockImplementation(
                () => result
            );

            expect(
                helperDateService.roundDown(date1, {
                    hour: true,
                    minute: false,
                    second: false,
                })
            ).toBe(result);
        });

        it('should be success with options minute', async () => {
            const result = helperDateService.roundDown(date1, {
                hour: false,
                minute: true,
                second: false,
            });
            jest.spyOn(helperDateService, 'roundDown').mockImplementation(
                () => result
            );

            expect(
                helperDateService.roundDown(date1, {
                    hour: false,
                    minute: true,
                    second: false,
                })
            ).toBe(result);
        });

        it('should be success with options second', async () => {
            const result = helperDateService.roundDown(date1, {
                hour: false,
                minute: false,
                second: true,
            });
            jest.spyOn(helperDateService, 'roundDown').mockImplementation(
                () => result
            );

            expect(
                helperDateService.roundDown(date1, {
                    hour: false,
                    minute: false,
                    second: true,
                })
            ).toBe(result);
        });
    });
});
