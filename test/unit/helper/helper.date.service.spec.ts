import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
    ENUM_HELPER_DATE_DIFF,
    ENUM_HELPER_DATE_FORMAT,
} from 'src/common/helper/constants/helper.enum.constant';
import { HelperModule } from 'src/common/helper/helper.module';
import { IHelperDateExtractDate } from 'src/common/helper/interfaces/helper.interface';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import configs from 'src/configs';

describe('HelperDateService', () => {
    let helperDateService: HelperDateService;
    const dateString = '2000-01-01';
    const date1: Date = new Date('2000-01-01');
    const date2: Date = new Date('2010-01-10');
    const dateTimestamp: number = date2.valueOf();

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

    afterEach(async () => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(helperDateService).toBeDefined();
    });

    describe('calculateAge', () => {
        it('return age in number', async () => {
            const result: number = helperDateService.calculateAge(date1);

            jest.spyOn(helperDateService, 'calculateAge').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });
    });

    describe('diff', () => {
        it('should be return a number of days differences', async () => {
            const result: number = helperDateService.diff(date1, date2);

            jest.spyOn(helperDateService, 'diff').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('should be return a number of minutes differences', async () => {
            const result: number = helperDateService.diff(date1, date2, {
                format: ENUM_HELPER_DATE_DIFF.MINUTES,
            });

            jest.spyOn(helperDateService, 'diff').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('should be return a number of minutes differences', async () => {
            const result: number = helperDateService.diff(date1, date2, {
                format: ENUM_HELPER_DATE_DIFF.HOURS,
            });

            jest.spyOn(helperDateService, 'diff').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('should be return a number of minutes days', async () => {
            const result: number = helperDateService.diff(date1, date2, {
                format: ENUM_HELPER_DATE_DIFF.DAYS,
            });

            jest.spyOn(helperDateService, 'diff').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('should be return a number of seconds differences', async () => {
            const result: number = helperDateService.diff(date1, date2, {
                format: ENUM_HELPER_DATE_DIFF.SECONDS,
            });

            jest.spyOn(helperDateService, 'diff').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('should be return a number of milis differences', async () => {
            const result: number = helperDateService.diff(date1, date2, {
                format: ENUM_HELPER_DATE_DIFF.MILIS,
            });

            jest.spyOn(helperDateService, 'diff').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });
    });

    describe('check', () => {
        it('string must be a valid date', async () => {
            const result: boolean = helperDateService.check(dateString);

            jest.spyOn(helperDateService, 'check').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });

        it('date must be a valid date', async () => {
            const result: boolean = helperDateService.check(date1);

            jest.spyOn(helperDateService, 'check').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });

        it('number must be a valid date', async () => {
            const result: boolean = helperDateService.check(dateTimestamp);

            jest.spyOn(helperDateService, 'check').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });
    });

    describe('checkTimestamp', () => {
        it('number must be a valid timestamp', async () => {
            const result: boolean =
                helperDateService.checkTimestamp(dateTimestamp);

            jest.spyOn(helperDateService, 'checkTimestamp').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });
    });

    describe('create', () => {
        it('should be create date base on today', async () => {
            const result: Date = helperDateService.create();

            jest.spyOn(helperDateService, 'create').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('should be create date base on date parameter', async () => {
            const result: Date = helperDateService.create(date1);

            jest.spyOn(helperDateService, 'create').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('should be create date base on today and force the time to start of day', async () => {
            const result: Date = helperDateService.create(null, {
                startOfDay: true,
            });

            jest.spyOn(helperDateService, 'create').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });
    });

    describe('timestamp', () => {
        it('should be create timestamp base on today', async () => {
            const result: number = helperDateService.timestamp();

            jest.spyOn(helperDateService, 'timestamp').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });

        it('should be create timestamp base on date parameter', async () => {
            const result: number = helperDateService.timestamp(date1);

            jest.spyOn(helperDateService, 'timestamp').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });

        it('should be create timestamp base on today and force the time to start of day', async () => {
            const result: number = helperDateService.timestamp(null, {
                startOfDay: true,
            });

            jest.spyOn(helperDateService, 'timestamp').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });
    });

    describe('format', () => {
        it('should be return a day as string, default', async () => {
            const result: string = helperDateService.format(date1);

            jest.spyOn(helperDateService, 'format').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result).toBe('2000-01-01');
        });

        it('should be return a day as string, format date', async () => {
            const result: string = helperDateService.format(date1, {
                format: ENUM_HELPER_DATE_FORMAT.DATE,
            });

            jest.spyOn(helperDateService, 'format').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result).toBe('2000-01-01');
        });

        it('should be return a day as string, format friendly date', async () => {
            const result: string = helperDateService.format(date1, {
                format: ENUM_HELPER_DATE_FORMAT.FRIENDLY_DATE,
            });

            jest.spyOn(helperDateService, 'format').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('should be return a day as string, format friendly date time', async () => {
            const result: string = helperDateService.format(date1, {
                format: ENUM_HELPER_DATE_FORMAT.FRIENDLY_DATE_TIME,
            });

            jest.spyOn(helperDateService, 'format').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('should be return a day as string, format year and month only', async () => {
            const result: string = helperDateService.format(date1, {
                format: ENUM_HELPER_DATE_FORMAT.YEAR_MONTH,
            });

            jest.spyOn(helperDateService, 'format').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result).toBe('2000-01');
        });

        it('should be return a day as string, format month and date only', async () => {
            const result: string = helperDateService.format(date1, {
                format: ENUM_HELPER_DATE_FORMAT.MONTH_DATE,
            });

            jest.spyOn(helperDateService, 'format').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result).toBe('01-01');
        });

        it('should be return a day as string, format only year', async () => {
            const result: string = helperDateService.format(date1, {
                format: ENUM_HELPER_DATE_FORMAT.ONLY_YEAR,
            });

            jest.spyOn(helperDateService, 'format').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result).toBe('2000');
        });

        it('should be return a day as string, format only month', async () => {
            const result: string = helperDateService.format(date1, {
                format: ENUM_HELPER_DATE_FORMAT.ONLY_MONTH,
            });

            jest.spyOn(helperDateService, 'format').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result).toBe('01');
        });

        it('should be return a day as string, format only date', async () => {
            const result: string = helperDateService.format(date1, {
                format: ENUM_HELPER_DATE_FORMAT.ONLY_DATE,
            });

            jest.spyOn(helperDateService, 'format').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result).toBe('01');
        });

        it('should be return a day as string, format iso date', async () => {
            const result: string = helperDateService.format(date1, {
                format: ENUM_HELPER_DATE_FORMAT.ISO_DATE,
            });

            jest.spyOn(helperDateService, 'format').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('should be return a day as string, format only day and long version', async () => {
            const result: string = helperDateService.format(date1, {
                format: ENUM_HELPER_DATE_FORMAT.DAY_LONG,
            });

            jest.spyOn(helperDateService, 'format').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('should be return a day as string, format only day and short version', async () => {
            const result: string = helperDateService.format(date1, {
                format: ENUM_HELPER_DATE_FORMAT.DAY_SHORT,
            });

            jest.spyOn(helperDateService, 'format').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('should be return a day as string, format only hour and long version', async () => {
            const result: string = helperDateService.format(date1, {
                format: ENUM_HELPER_DATE_FORMAT.HOUR_LONG,
            });

            jest.spyOn(helperDateService, 'format').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('should be return a day as string, format only hour and short version', async () => {
            const result: string = helperDateService.format(date1, {
                format: ENUM_HELPER_DATE_FORMAT.HOUR_SHORT,
            });

            jest.spyOn(helperDateService, 'format').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('should be return a day as string, format only minute and long version', async () => {
            const result: string = helperDateService.format(date1, {
                format: ENUM_HELPER_DATE_FORMAT.MINUTE_LONG,
            });

            jest.spyOn(helperDateService, 'format').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('should be return a day as string, format only minute and short version', async () => {
            const result: string = helperDateService.format(date1, {
                format: ENUM_HELPER_DATE_FORMAT.MINUTE_SHORT,
            });

            jest.spyOn(helperDateService, 'format').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('should be return a day as string, format only second and long version', async () => {
            const result: string = helperDateService.format(date1, {
                format: ENUM_HELPER_DATE_FORMAT.SECOND_LONG,
            });

            jest.spyOn(helperDateService, 'format').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('should be return a day as string, format only second and short version', async () => {
            const result: string = helperDateService.format(date1, {
                format: ENUM_HELPER_DATE_FORMAT.SECOND_SHORT,
            });

            jest.spyOn(helperDateService, 'format').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });
    });

    describe('forwardInMilliseconds', () => {
        it('should be forward to 2 milis from today', async () => {
            const result: Date = helperDateService.forwardInMilliseconds(2);

            jest.spyOn(
                helperDateService,
                'forwardInMilliseconds'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('should be forward to 2 milis from x date', async () => {
            const result: Date = helperDateService.forwardInMilliseconds(2, {
                fromDate: date1,
            });

            jest.spyOn(
                helperDateService,
                'forwardInMilliseconds'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });
    });

    describe('backwardInMilliseconds', () => {
        it('should be backward to 2 milis from today', async () => {
            const result: Date = helperDateService.backwardInMilliseconds(2);

            jest.spyOn(
                helperDateService,
                'backwardInMilliseconds'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('should be backward to 2 milis from x date', async () => {
            const result: Date = helperDateService.backwardInMilliseconds(2, {
                fromDate: date1,
            });

            jest.spyOn(
                helperDateService,
                'backwardInMilliseconds'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });
    });

    describe('forwardInSeconds', () => {
        it('should be forward to 2 seconds from today', async () => {
            const result: Date = helperDateService.forwardInSeconds(2);

            jest.spyOn(
                helperDateService,
                'forwardInSeconds'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('should be forward to 2 seconds from x date', async () => {
            const result: Date = helperDateService.forwardInSeconds(2, {
                fromDate: date1,
            });

            jest.spyOn(
                helperDateService,
                'forwardInSeconds'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });
    });

    describe('backwardInSeconds', () => {
        it('should be backward to 2 seconds from today', async () => {
            const result: Date = helperDateService.backwardInSeconds(2);

            jest.spyOn(
                helperDateService,
                'backwardInSeconds'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('should be backward to 2 seconds from x date', async () => {
            const result: Date = helperDateService.backwardInSeconds(2, {
                fromDate: date1,
            });

            jest.spyOn(
                helperDateService,
                'backwardInSeconds'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });
    });

    describe('forwardInMinutes', () => {
        it('should be forward to 2 minutes from today', async () => {
            const result: Date = helperDateService.forwardInMinutes(2);

            jest.spyOn(
                helperDateService,
                'forwardInMinutes'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('should be forward to 2 minutes from x date', async () => {
            const result: Date = helperDateService.forwardInMinutes(2, {
                fromDate: date1,
            });

            jest.spyOn(
                helperDateService,
                'forwardInMinutes'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });
    });

    describe('backwardInMinutes', () => {
        it('should be backward to 2 minutes from today', async () => {
            const result: Date = helperDateService.backwardInMinutes(2);

            jest.spyOn(
                helperDateService,
                'backwardInMinutes'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('should be backward to 2 minutes from x date', async () => {
            const result: Date = helperDateService.backwardInMinutes(2, {
                fromDate: date1,
            });

            jest.spyOn(
                helperDateService,
                'backwardInMinutes'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });
    });

    describe('forwardInHours', () => {
        it('should be forward to 2 hours from today', async () => {
            const result: Date = helperDateService.forwardInHours(2);

            jest.spyOn(helperDateService, 'forwardInHours').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });

        it('should be forward to 2 hours from x date', async () => {
            const result: Date = helperDateService.forwardInHours(2, {
                fromDate: date1,
            });

            jest.spyOn(helperDateService, 'forwardInHours').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });
    });

    describe('backwardInHours', () => {
        it('should be backward to 2 hours from today', async () => {
            const result: Date = helperDateService.backwardInHours(2);

            jest.spyOn(
                helperDateService,
                'backwardInHours'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('should be backward to 2 hours from x date', async () => {
            const result: Date = helperDateService.backwardInHours(2, {
                fromDate: date1,
            });

            jest.spyOn(
                helperDateService,
                'backwardInHours'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });
    });

    describe('forwardInDays', () => {
        it('should be forward to 2 days from today', async () => {
            const result: Date = helperDateService.forwardInDays(2);

            jest.spyOn(helperDateService, 'forwardInDays').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });

        it('should be forward to 2 days from x date', async () => {
            const result: Date = helperDateService.forwardInDays(2, {
                fromDate: date1,
            });

            jest.spyOn(helperDateService, 'forwardInDays').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });
    });

    describe('backwardInDays', () => {
        it('should be backward to 2 days from today', async () => {
            const result: Date = helperDateService.backwardInDays(2);

            jest.spyOn(helperDateService, 'backwardInDays').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });

        it('should be backward to 2 days from x date', async () => {
            const result: Date = helperDateService.backwardInDays(2, {
                fromDate: date1,
            });

            jest.spyOn(helperDateService, 'backwardInDays').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });
    });

    describe('forwardInMonths', () => {
        it('should be forward to 2 months from today', async () => {
            const result: Date = helperDateService.forwardInMonths(2);

            jest.spyOn(
                helperDateService,
                'forwardInMonths'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('should be forward to 2 months from x date', async () => {
            const result: Date = helperDateService.forwardInMonths(2, {
                fromDate: date1,
            });

            jest.spyOn(
                helperDateService,
                'forwardInMonths'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });
    });

    describe('backwardInMonths', () => {
        it('should be backward to 2 months from today', async () => {
            const result: Date = helperDateService.backwardInMonths(2);

            jest.spyOn(
                helperDateService,
                'backwardInMonths'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('should be backward to 2 months from x date', async () => {
            const result: Date = helperDateService.backwardInMonths(2, {
                fromDate: date1,
            });

            jest.spyOn(
                helperDateService,
                'backwardInMonths'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });
    });

    describe('endOfMonth', () => {
        it('return date end of current year', async () => {
            const result: Date = helperDateService.endOfMonth();

            jest.spyOn(helperDateService, 'endOfMonth').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });

        it('return date end of x year', async () => {
            const result: Date = helperDateService.endOfMonth(date1);

            jest.spyOn(helperDateService, 'endOfMonth').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });
    });

    describe('startOfMonth', () => {
        it('return date start of current year', async () => {
            const result: Date = helperDateService.startOfMonth();

            jest.spyOn(helperDateService, 'startOfMonth').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });

        it('return date start of x year', async () => {
            const result: Date = helperDateService.startOfMonth(date1);

            jest.spyOn(helperDateService, 'startOfMonth').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });
    });

    describe('endOfYear', () => {
        it('return date end of current year', async () => {
            const result: Date = helperDateService.endOfYear();

            jest.spyOn(helperDateService, 'endOfYear').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });

        it('return date end of x year', async () => {
            const result: Date = helperDateService.endOfYear(date1);

            jest.spyOn(helperDateService, 'endOfYear').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });
    });

    describe('startOfYear', () => {
        it('return date start of current year', async () => {
            const result: Date = helperDateService.startOfYear();

            jest.spyOn(helperDateService, 'startOfYear').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });

        it('return date start of x year', async () => {
            const result: Date = helperDateService.startOfYear(date1);

            jest.spyOn(helperDateService, 'startOfYear').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });
    });

    describe('endOfDay', () => {
        it('return date end of current year', async () => {
            const result: Date = helperDateService.endOfDay();

            jest.spyOn(helperDateService, 'endOfDay').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });

        it('return date end of x year', async () => {
            const result: Date = helperDateService.endOfDay(date1);

            jest.spyOn(helperDateService, 'endOfDay').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });
    });

    describe('startOfDay', () => {
        it('return date start of current year', async () => {
            const result: Date = helperDateService.startOfDay();

            jest.spyOn(helperDateService, 'startOfDay').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });

        it('return date start of x year', async () => {
            const result: Date = helperDateService.startOfDay(date1);

            jest.spyOn(helperDateService, 'startOfDay').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });
    });

    describe('extractDate', () => {
        it('should extract a date to dat, month, and year as number', async () => {
            const result: IHelperDateExtractDate =
                helperDateService.extractDate(date1);

            jest.spyOn(helperDateService, 'extractDate').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
            expect(result.day).toBe('01');
            expect(result.month).toBe('01');
            expect(result.year).toBe('2000');
        });
    });

    describe('roundDown', () => {
        it('should be round down a milis from date', async () => {
            const result: Date = helperDateService.roundDown(date1);

            jest.spyOn(helperDateService, 'roundDown').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });

        it('should be round down a milis and hours from date', async () => {
            const result: Date = helperDateService.roundDown(date1, {
                hour: true,
                minute: false,
                second: false,
            });

            jest.spyOn(helperDateService, 'roundDown').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });

        it('should be round down a milis and minutes from date', async () => {
            const result: Date = helperDateService.roundDown(date1, {
                hour: false,
                minute: true,
                second: false,
            });

            jest.spyOn(helperDateService, 'roundDown').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });

        it('should be round down a milis and seconds from date', async () => {
            const result: Date = helperDateService.roundDown(date1, {
                hour: false,
                minute: false,
                second: true,
            });

            jest.spyOn(helperDateService, 'roundDown').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });
    });
});
