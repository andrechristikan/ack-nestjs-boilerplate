import { Test, TestingModule } from '@nestjs/testing';
import {
    ENUM_HELPER_DATE_DIFF,
    ENUM_HELPER_DATE_FORMAT,
} from 'src/common/helper/constants/helper.enum.constant';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';

describe('HelperDateService', () => {
    let service: HelperDateService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [HelperDateService],
        }).compile();

        process.env.TZ = 'UTC';
        service = module.get<HelperDateService>(HelperDateService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('calculateAge', () => {
        it('should calculate age correctly', () => {
            const dateOfBirth = new Date('1990-01-01');
            const age = service.calculateAge(dateOfBirth, 2021);
            expect(age).toEqual(31);
        });
    });

    describe('diff', () => {
        it('should diff two dates and return result in days by default', () => {
            const dateOne = new Date('2021-01-01');
            const dateTwo = new Date('2021-01-03');
            const diff = service.diff(dateOne, dateTwo);
            expect(diff).toEqual(2);
        });

        it('should diff two dates and return result in milliseconds when specified', () => {
            const dateOne = new Date('2021-01-01');
            const dateTwo = new Date('2021-01-03');
            const diff = service.diff(dateOne, dateTwo, {
                format: ENUM_HELPER_DATE_DIFF.MILIS,
            });
            expect(diff).toEqual(172800000);
        });

        it('should diff two dates and return result in seconds when specified', () => {
            const dateOne = new Date('2021-01-01');
            const dateTwo = new Date('2021-01-03');
            const diff = service.diff(dateOne, dateTwo, {
                format: ENUM_HELPER_DATE_DIFF.SECONDS,
            });
            expect(diff).toEqual(172800);
        });

        it('should diff two dates and return result in hours when specified', () => {
            const dateOne = new Date('2021-01-01');
            const dateTwo = new Date('2021-01-03');
            const diff = service.diff(dateOne, dateTwo, {
                format: ENUM_HELPER_DATE_DIFF.HOURS,
            });
            expect(diff).toEqual(48);
        });

        it('should diff two dates and return result in minutes when specified', () => {
            const dateOne = new Date('2021-01-01');
            const dateTwo = new Date('2021-01-03');
            const diff = service.diff(dateOne, dateTwo, {
                format: ENUM_HELPER_DATE_DIFF.MINUTES,
            });
            expect(diff).toEqual(2880);
        });
    });

    describe('check', () => {
        it('should check if a given date is valid', () => {
            const validDate = '2021-01-01';
            const invalidDate = 'abcd';
            expect(service.check(validDate)).toEqual(true);
            expect(service.check(invalidDate)).toEqual(false);
        });
    });

    describe('check', () => {
        it('should check if a given timestamp is valid', () => {
            const validTimestamp = new Date().getTime();
            expect(service.checkTimestamp(validTimestamp)).toEqual(true);
        });
    });

    describe('create', () => {
        it('should create a current date', () => {
            const createdDate = service.create();
            expect(createdDate).toEqual(new Date(createdDate));
        });

        it('should create a date with given options', () => {
            const date = '2021-01-01';
            const startOfDay = true;
            const createdDate = service.create(date, { startOfDay });
            expect(createdDate).toEqual(new Date(`2021-01-01T00:00:00.000Z`));
        });
    });

    describe('timestamp', () => {
        it('should return a current timestamp', () => {
            const createdTimestamp = service.timestamp();
            expect(createdTimestamp).toEqual(
                new Date(createdTimestamp).getTime()
            );
        });

        it('should return a timestamp with given options', () => {
            const date = '2021-01-01T00:00:00.000Z';
            const startOfDay = true;
            const createdTimestamp = service.timestamp(date, { startOfDay });
            expect(createdTimestamp).toEqual(new Date(date).getTime());
        });
    });

    describe('format', () => {
        it('should format a date', () => {
            const date = new Date('2021-01-01');
            const formattedDate = service.format(date);
            expect(formattedDate).toEqual('2021-01-01');
        });

        it('should format a date with given options', () => {
            const date = new Date('2021-01-01');
            const format = ENUM_HELPER_DATE_FORMAT.ONLY_MONTH;
            const formattedDate = service.format(date, { format });
            expect(formattedDate).toEqual('01');
        });
    });

    describe('forwardInMilliseconds', () => {
        it('should add milliseconds to a date', () => {
            const fromDate = new Date('2021-01-01');
            const milliseconds = 10000;
            const resultDate = service.forwardInMilliseconds(milliseconds, {
                fromDate,
            });
            expect(resultDate).toEqual(new Date('2021-01-01T00:00:10.000Z'));
        });
    });

    describe('backwardInMilliseconds', () => {
        it('should subtract milliseconds from a date', () => {
            const fromDate = new Date('2021-01-01T00:00:10.000Z');
            const milliseconds = 10000;
            const resultDate = service.backwardInMilliseconds(milliseconds, {
                fromDate,
            });
            expect(resultDate).toEqual(new Date('2021-01-01T00:00:00.000Z'));
        });
    });

    describe('forwardInSeconds', () => {
        it('should add seconds to a date', () => {
            const fromDate = new Date('2021-01-01');
            const seconds = 60;
            const resultDate = service.forwardInSeconds(seconds, { fromDate });
            expect(resultDate).toEqual(new Date('2021-01-01T00:01:00.000Z'));
        });
    });

    describe('backwardInSeconds', () => {
        it('should subtract seconds from a date', () => {
            const fromDate = new Date('2021-01-01T00:01:00.000Z');
            const seconds = 60;
            const resultDate = service.backwardInSeconds(seconds, { fromDate });
            expect(resultDate).toEqual(new Date('2021-01-01T00:00:00.000Z'));
        });
    });

    describe('forwardInMinutes', () => {
        it('should add minutes to a date', () => {
            const fromDate = new Date('2021-01-01');
            const minutes = 60;
            const resultDate = service.forwardInMinutes(minutes, { fromDate });
            expect(resultDate).toEqual(new Date('2021-01-01T01:00:00.000Z'));
        });
    });

    describe('backwardInMinutes', () => {
        it('should subtract minutes from a date', () => {
            const fromDate = new Date('2021-01-01T01:00:00.000Z');
            const minutes = 60;
            const resultDate = service.backwardInMinutes(minutes, { fromDate });
            expect(resultDate).toEqual(new Date('2021-01-01T00:00:00.000Z'));
        });
    });

    describe('forwardInHours', () => {
        it('should add hours to a date', () => {
            const fromDate = new Date('2021-01-01');
            const hours = 24;
            const resultDate = service.forwardInHours(hours, { fromDate });
            expect(resultDate).toEqual(new Date('2021-01-02T00:00:00.000Z'));
        });
    });

    describe('backwardInHours', () => {
        it('should subtract hours from a date', () => {
            const fromDate = new Date('2021-01-02T00:00:00.000Z');
            const hours = 24;
            const resultDate = service.backwardInHours(hours, { fromDate });
            expect(resultDate).toEqual(new Date('2021-01-01T00:00:00.000Z'));
        });
    });

    describe('forwardInDays', () => {
        it('should add days to a date', () => {
            const fromDate = new Date('2021-01-01');
            const days = 31;
            const resultDate = service.forwardInDays(days, { fromDate });
            expect(resultDate).toEqual(new Date('2021-02-01T00:00:00.000Z'));
        });
    });

    describe('backwardInDays', () => {
        it('should subtract days from a date', () => {
            const fromDate = new Date('2021-02-01T00:00:00.000Z');
            const days = 31;
            const resultDate = service.backwardInDays(days, { fromDate });
            expect(resultDate).toEqual(new Date('2021-01-01T00:00:00.000Z'));
        });
    });

    describe('forwardInMonths', () => {
        it('should add months to a date', () => {
            const fromDate = new Date('2021-01-01');
            const months = 1;
            const resultDate = service.forwardInMonths(months, { fromDate });
            expect(resultDate).toEqual(new Date('2021-02-01T00:00:00.000Z'));
        });
    });

    describe('backwardInMonths', () => {
        it('should subtract months from a date', () => {
            const fromDate = new Date('2021-02-01T00:00:00.000Z');
            const months = 1;
            const resultDate = service.backwardInMonths(months, { fromDate });
            expect(resultDate).toEqual(new Date('2021-01-01T00:00:00.000Z'));
        });
    });

    describe('endOfMonth', () => {
        it('should return the end of the month for a given date if no date is provided', () => {
            const date = '2021-01-31T23:59:59.999Z';
            const endDate = service.endOfMonth(new Date(date));
            expect(endDate).toEqual(new Date('2021-01-31T23:59:59.999Z'));
        });
    });

    describe('startOfMonth', () => {
        it('should return the start of the month for a given date if no date is provided', () => {
            const date = '2021-01-01T00:00:00.000Z';
            const startDate = service.startOfMonth(new Date(date));
            expect(startDate).toEqual(new Date('2021-01-01T00:00:00.000Z'));
        });
    });

    describe('endOfYear', () => {
        it('should return the end of the year for a given date if no date is provided', () => {
            const date = '2021-12-31T23:59:59.999Z';
            const endDate = service.endOfYear(new Date(date));
            expect(endDate).toEqual(new Date('2021-12-31T23:59:59.999Z'));
        });
    });

    describe('startOfYear', () => {
        it('should return the start of the year for a given date if no date is provided', () => {
            const date = '2021-01-01T00:00:00.000Z';
            const startDate = service.startOfYear(new Date(date));
            expect(startDate).toEqual(new Date('2021-01-01T00:00:00.000Z'));
        });
    });

    describe('endOfDay', () => {
        it('should return the end of the day for a given date if no date is provided', () => {
            const date = '2021-01-01T23:59:59.999Z';
            const endDate = service.endOfDay(new Date(date));
            expect(endDate).toEqual(new Date('2021-01-01T23:59:59.999Z'));
        });
    });

    describe('startOfDay', () => {
        it('should return the start of the day for a given date if no date is provided', () => {
            const date = '2021-01-01T00:00:00.000Z';
            const startDate = service.startOfDay(new Date(date));
            expect(startDate).toEqual(new Date('2021-01-01T00:00:00.000Z'));
        });
    });

    describe('extractDate', () => {
        it('should extract day, month, and year from a given date', () => {
            const date = new Date('2021-01-01');
            const extractedDate = service.extractDate(date);
            expect(extractedDate).toEqual({
                date,
                day: '01',
                month: '01',
                year: '2021',
            });
        });
    });

    describe('roundDown', () => {
        it('should round down a given date', () => {
            const date = new Date('2021-01-01T12:34:56.789Z');
            const roundedDate = service.roundDown(date, {
                hour: true,
                minute: true,
                second: true,
            });
            expect(roundedDate).toEqual(new Date('2021-01-01T00:00:00.000Z'));
        });
    });

    describe('getStartAndEndDate', () => {
        it('should return the start and end date for current month', () => {
            const startDate = new Date(
                new Date(new Date().setDate(1)).setHours(0, 0, 0, 0)
            );
            const endDate = new Date(
                new Date(
                    startDate.getFullYear(),
                    startDate.getMonth() + 1,
                    0
                ).setHours(23, 59, 59, 999)
            );
            const startAndEndDate = service.getStartAndEndDate();
            expect(startAndEndDate).toEqual({ startDate, endDate });
        });

        it('should return the start and end date of a given month and year', () => {
            const startDate = new Date('2021-01-01T00:00:00.000Z');
            const endDate = new Date('2021-01-31T23:59:59.999Z');
            const startAndEndDate = service.getStartAndEndDate({
                year: 2021,
                month: 1,
            });
            expect(startAndEndDate).toEqual({ startDate, endDate });
        });
    });
});
