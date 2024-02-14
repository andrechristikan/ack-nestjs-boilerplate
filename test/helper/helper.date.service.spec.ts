import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
    ENUM_HELPER_DATE_DIFF,
    ENUM_HELPER_DATE_FORMAT,
} from 'src/common/helper/constants/helper.enum.constant';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';

describe('HelperDateService', () => {
    let service: HelperDateService;

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                HelperDateService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockImplementation((key: string) => {
                            switch (key) {
                                case 'app.tz':
                                default:
                                    return 'UTC';
                            }
                        }),
                    },
                },
            ],
        }).compile();

        process.env.TZ = 'UTC';
        service = moduleRef.get<HelperDateService>(HelperDateService);
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

    describe('checkIso', () => {
        it('should check date if a given date is valid', () => {
            const validDate = '2021-01-01';
            expect(service.checkIso(validDate)).toEqual(true);
        });

        it('should check date time if a given date is valid', () => {
            const validDate = '2021-01-01T01:01:01.000Z';
            expect(service.checkIso(validDate)).toEqual(true);
        });

        it('should check date as invalid', () => {
            const invalidDate = 'abcd';
            expect(service.checkIso(invalidDate)).toEqual(false);
        });
    });

    describe('checkTimestamp', () => {
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

        it('should create a current date with options startOfDay', () => {
            const startOfDay = true;
            const createdDate = service.create(undefined, { startOfDay });

            expect(createdDate).toEqual(new Date(createdDate));
        });

        it('should create a date with given value and options', () => {
            const date = '2021-01-01';
            const startOfDay = true;
            const createdDate = service.create(date, { startOfDay });

            expect(createdDate).toEqual(new Date(`2021-01-01T00:00:00.000Z`));
        });

        it('should create a date time with given value', () => {
            const date = '2021-01-01T01:01:01.000Z';
            const createdDate = service.create(date);

            expect(createdDate).toEqual(new Date(`2021-01-01T01:01:01.000Z`));
        });
    });

    describe('createTimestamp', () => {
        it('should return a current timestamp', () => {
            const createdTimestamp = service.createTimestamp();
            expect(createdTimestamp).toEqual(
                new Date(createdTimestamp).getTime()
            );
        });

        it('should return a timestamp with given options', () => {
            const date = '2021-01-01T00:00:00.000Z';
            const startOfDay = true;
            const createdTimestamp = service.createTimestamp(date, {
                startOfDay,
            });
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

    describe('formatIsoDurationFromMinutes', () => {
        it('should return the duration as iso date string', () => {
            const inMinutes = 5;
            const duration = service.formatIsoDurationFromMinutes(inMinutes);
            expect(duration).toEqual('PT5M');
        });
    });

    describe('formatIsoDurationFromHours', () => {
        it('should return the duration as iso date string', () => {
            const inHours = 5;
            const duration = service.formatIsoDurationFromHours(inHours);
            expect(duration).toEqual('PT5H');
        });
    });

    describe('formatIsoDurationFromDays', () => {
        it('should return the duration as iso date string', () => {
            const inDays = 5;
            const duration = service.formatIsoDurationFromDays(inDays);
            expect(duration).toEqual('P5D');
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

    describe('forwardInYears', () => {
        it('should add years to a date', () => {
            const fromDate = new Date('2021-01-01');
            const years = 1;
            const resultDate = service.forwardInYears(years, { fromDate });
            expect(resultDate).toEqual(new Date('2022-01-01T00:00:00.000Z'));
        });
    });

    describe('backwardInYears', () => {
        it('should subtract years from a date', () => {
            const fromDate = new Date('2021-02-01T00:00:00.000Z');
            const years = 1;
            const resultDate = service.backwardInYears(years, { fromDate });
            expect(resultDate).toEqual(new Date('2020-02-01T00:00:00.000Z'));
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

    describe('setTime', () => {
        it('should return the date and time', () => {
            const date = '2021-01-01T00:00:00.000Z';
            const startDate = service.create(date);
            const setTime = service.setTime(startDate, {
                hour: 1,
                minute: 59,
                second: 59,
            });
            expect(setTime).toEqual(new Date('2021-01-01T01:59:59.000Z'));
        });
    });

    describe('addTime', () => {
        it('should return date adn time added', () => {
            const date = '2021-01-01T00:00:00.000Z';
            const startDate = service.create(date);
            const setTime = service.addTime(startDate, {
                hour: 0,
                minute: 10,
                second: 0,
            });
            expect(setTime).toEqual(new Date('2021-01-01T00:10:00.000Z'));
        });
    });

    describe('subtractTime', () => {
        it('should return date adn time added', () => {
            const date = '2021-01-01T00:00:00.000Z';
            const startDate = service.create(date);
            const setTime = service.subtractTime(startDate, {
                hour: 0,
                minute: 10,
                second: 0,
            });
            expect(setTime).toEqual(new Date('2020-12-31T23:50:00.000Z'));
        });
    });

    describe('roundDown', () => {
        it('should round down a given date', () => {
            const date = new Date('2021-01-01T12:34:56.789Z');
            const roundedDate = service.roundDown(date, {
                hour: true,
                minute: true,
                second: true,
                millisecond: true,
            });
            expect(roundedDate).toEqual(new Date('2021-01-01T00:00:00.000Z'));
        });
    });
});
