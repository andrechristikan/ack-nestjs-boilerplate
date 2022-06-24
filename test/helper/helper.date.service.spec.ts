import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { CoreModule } from 'src/core/core.module';
import {
    ENUM_HELPER_DATE_DIFF,
    ENUM_HELPER_DATE_FORMAT,
} from 'src/utils/helper/helper.constant';
import { HelperDateService } from 'src/utils/helper/service/helper.date.service';

describe('HelperDateService', () => {
    let helperDateService: HelperDateService;
    let configService: ConfigService;
    const date1 = new Date();
    const date2 = new Date();
    let timezone: string;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CoreModule],
        }).compile();

        helperDateService = moduleRef.get<HelperDateService>(HelperDateService);
        configService = moduleRef.get<ConfigService>(ConfigService);

        timezone = configService.get<string>('app.timezone');
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
            const result = helperDateService.calculateAge(date1, { timezone });
            jest.spyOn(helperDateService, 'calculateAge').mockImplementation(
                () => result
            );

            expect(helperDateService.calculateAge(date1, { timezone })).toBe(
                result
            );
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
            const result = helperDateService.diff(date1, date2, {
                timezone,
            });
            jest.spyOn(helperDateService, 'diff').mockImplementation(
                () => result
            );

            expect(
                helperDateService.diff(date1, date2, {
                    timezone,
                })
            ).toBe(result);
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
            const result = helperDateService.check(date1.toISOString(), {
                timezone,
            });
            jest.spyOn(helperDateService, 'check').mockImplementation(
                () => result
            );

            expect(
                helperDateService.check(date1.toISOString(), { timezone })
            ).toBe(result);
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
            const result = helperDateService.checkTimestamp(date1.valueOf(), {
                timezone,
            });
            jest.spyOn(helperDateService, 'checkTimestamp').mockImplementation(
                () => result
            );

            expect(
                helperDateService.checkTimestamp(date1.valueOf(), { timezone })
            ).toBe(result);
        });
    });

    describe('checkTimezone', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'checkTimezone');

            helperDateService.checkTimezone(timezone);
            expect(test).toHaveBeenCalledWith(timezone);
        });

        it('should be success', async () => {
            const result = helperDateService.checkTimezone(timezone);
            jest.spyOn(helperDateService, 'checkTimezone').mockImplementation(
                () => result
            );

            expect(helperDateService.checkTimezone(timezone)).toBe(result);
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
            const result = helperDateService.create({ date: date1, timezone });
            jest.spyOn(helperDateService, 'create').mockImplementation(
                () => result
            );

            expect(helperDateService.create({ date: date1, timezone })).toBe(
                result
            );
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
                timezone,
            });
            jest.spyOn(helperDateService, 'timestamp').mockImplementation(
                () => result
            );

            expect(helperDateService.timestamp({ date: date1, timezone })).toBe(
                result
            );
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
            const result = helperDateService.format(date1, {
                timezone: 'ASIA/JAKARTA',
            });
            jest.spyOn(helperDateService, 'format').mockImplementation(
                () => result
            );

            expect(
                helperDateService.format(date1, {
                    timezone: 'ASIA/JAKARTA',
                })
            ).toBe(result);
        });

        it('should be success with options timezone and format', async () => {
            const result = helperDateService.format(date1, {
                timezone: 'ASIA/JAKARTA',
                format: ENUM_HELPER_DATE_FORMAT.DATE,
            });
            jest.spyOn(helperDateService, 'format').mockImplementation(
                () => result
            );

            expect(
                helperDateService.format(date1, {
                    timezone: 'ASIA/JAKARTA',
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
                timezone,
            });
            jest.spyOn(
                helperDateService,
                'forwardInMilliseconds'
            ).mockImplementation(() => result);

            expect(
                helperDateService.forwardInMilliseconds(2, {
                    fromDate: date1,
                    timezone,
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
                timezone,
            });
            jest.spyOn(
                helperDateService,
                'backwardInMilliseconds'
            ).mockImplementation(() => result);

            expect(
                helperDateService.backwardInMilliseconds(2, {
                    fromDate: date1,
                    timezone,
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
                timezone,
            });
            jest.spyOn(
                helperDateService,
                'forwardInSeconds'
            ).mockImplementation(() => result);

            expect(
                helperDateService.forwardInSeconds(2, {
                    fromDate: date1,
                    timezone,
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
                timezone,
            });
            jest.spyOn(
                helperDateService,
                'backwardInSeconds'
            ).mockImplementation(() => result);

            expect(
                helperDateService.backwardInSeconds(2, {
                    fromDate: date1,
                    timezone,
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
                timezone,
            });
            jest.spyOn(
                helperDateService,
                'forwardInMinutes'
            ).mockImplementation(() => result);

            expect(
                helperDateService.forwardInMinutes(2, {
                    fromDate: date1,
                    timezone,
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
                timezone,
            });
            jest.spyOn(
                helperDateService,
                'backwardInMinutes'
            ).mockImplementation(() => result);

            expect(
                helperDateService.backwardInMinutes(2, {
                    fromDate: date1,
                    timezone,
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
                timezone,
            });
            jest.spyOn(helperDateService, 'forwardInDays').mockImplementation(
                () => result
            );

            expect(
                helperDateService.forwardInDays(2, {
                    fromDate: date1,
                    timezone,
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
                timezone,
            });
            jest.spyOn(helperDateService, 'backwardInDays').mockImplementation(
                () => result
            );

            expect(
                helperDateService.backwardInDays(2, {
                    fromDate: date1,
                    timezone,
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
                timezone,
            });
            jest.spyOn(helperDateService, 'forwardInMonths').mockImplementation(
                () => result
            );

            expect(
                helperDateService.forwardInMonths(2, {
                    fromDate: date1,
                    timezone,
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
                timezone,
            });
            jest.spyOn(
                helperDateService,
                'backwardInMonths'
            ).mockImplementation(() => result);

            expect(
                helperDateService.backwardInMonths(2, {
                    fromDate: date1,
                    timezone,
                })
            ).toBe(result);
        });
    });

    describe('endOfMonth', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'endOfMonth');

            helperDateService.endOfMonth(2);
            expect(test).toHaveBeenCalledWith(2);
        });

        it('should be success', async () => {
            const result = helperDateService.endOfMonth(2);
            jest.spyOn(helperDateService, 'endOfMonth').mockImplementation(
                () => result
            );

            expect(helperDateService.endOfMonth(2)).toBe(result);
        });

        it('should be success with options year', async () => {
            const result = helperDateService.endOfMonth(2, {
                year: 1999,
            });
            jest.spyOn(helperDateService, 'endOfMonth').mockImplementation(
                () => result
            );

            expect(
                helperDateService.endOfMonth(2, {
                    year: 1999,
                })
            ).toBe(result);
        });

        it('should be success with options timezone', async () => {
            const result = helperDateService.endOfMonth(2, {
                timezone,
            });
            jest.spyOn(helperDateService, 'endOfMonth').mockImplementation(
                () => result
            );

            expect(
                helperDateService.endOfMonth(2, {
                    timezone,
                })
            ).toBe(result);
        });

        it('should be success with options year and timezone', async () => {
            const result = helperDateService.endOfMonth(2, {
                year: 1999,
                timezone,
            });
            jest.spyOn(helperDateService, 'endOfMonth').mockImplementation(
                () => result
            );

            expect(
                helperDateService.endOfMonth(2, {
                    year: 1999,
                    timezone,
                })
            ).toBe(result);
        });
    });

    describe('startOfMonth', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'startOfMonth');

            helperDateService.startOfMonth(2);
            expect(test).toHaveBeenCalledWith(2);
        });

        it('should be success', async () => {
            const result = helperDateService.startOfMonth(2);
            jest.spyOn(helperDateService, 'startOfMonth').mockImplementation(
                () => result
            );

            expect(helperDateService.startOfMonth(2)).toBe(result);
        });

        it('should be success with options year', async () => {
            const result = helperDateService.startOfMonth(2, {
                year: 1999,
            });
            jest.spyOn(helperDateService, 'startOfMonth').mockImplementation(
                () => result
            );

            expect(
                helperDateService.startOfMonth(2, {
                    year: 1999,
                })
            ).toBe(result);
        });

        it('should be success with options timezone', async () => {
            const result = helperDateService.startOfMonth(2, {
                timezone,
            });
            jest.spyOn(helperDateService, 'startOfMonth').mockImplementation(
                () => result
            );

            expect(
                helperDateService.startOfMonth(2, {
                    timezone,
                })
            ).toBe(result);
        });

        it('should be success with options year and timezone', async () => {
            const result = helperDateService.startOfMonth(2, {
                year: 1999,
                timezone,
            });
            jest.spyOn(helperDateService, 'startOfMonth').mockImplementation(
                () => result
            );

            expect(
                helperDateService.startOfMonth(2, {
                    year: 1999,
                    timezone,
                })
            ).toBe(result);
        });
    });

    describe('endOfYear', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'endOfYear');

            helperDateService.endOfYear(1999);
            expect(test).toHaveBeenCalledWith(1999);
        });

        it('should be success', async () => {
            const result = helperDateService.endOfYear(1999);
            jest.spyOn(helperDateService, 'endOfYear').mockImplementation(
                () => result
            );

            expect(helperDateService.endOfYear(1999)).toBe(result);
        });

        it('should be success with options timezone', async () => {
            const result = helperDateService.endOfYear(1999, {
                timezone,
            });
            jest.spyOn(helperDateService, 'endOfYear').mockImplementation(
                () => result
            );

            expect(
                helperDateService.endOfYear(1999, {
                    timezone,
                })
            ).toBe(result);
        });
    });

    describe('startOfYear', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperDateService, 'startOfYear');

            helperDateService.startOfYear(1999);
            expect(test).toHaveBeenCalledWith(1999);
        });

        it('should be success', async () => {
            const result = helperDateService.startOfYear(1999);
            jest.spyOn(helperDateService, 'startOfYear').mockImplementation(
                () => result
            );

            expect(helperDateService.startOfYear(1999)).toBe(result);
        });

        it('should be success with options timezone', async () => {
            const result = helperDateService.startOfYear(1999, {
                timezone,
            });
            jest.spyOn(helperDateService, 'startOfYear').mockImplementation(
                () => result
            );

            expect(
                helperDateService.startOfYear(1999, {
                    timezone,
                })
            ).toBe(result);
        });
    });
});
