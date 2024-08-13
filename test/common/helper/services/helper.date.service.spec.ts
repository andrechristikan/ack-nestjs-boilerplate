import { Test, TestingModule } from '@nestjs/testing';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { ConfigService } from '@nestjs/config';
import moment from 'moment-timezone';
import {
    IHelperDateCreateOptions,
    IHelperDateDiffOptions,
    IHelperDateFormatOptions,
    IHelperDateForwardOptions,
    IHelperDateRoundDownOptions,
    IHelperDateSetTimeOptions,
} from 'src/common/helper/interfaces/helper.interface';
import { ENUM_HELPER_DATE_DIFF } from 'src/common/helper/enums/helper.enum';

class MockConfigService {
    get(): string {
        return 'Asia/Jakarta';
    }
}

describe('HelperDateService', () => {
    let service: HelperDateService;
    let module: TestingModule;
    let defTz: string;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            providers: [
                HelperDateService,
                {
                    provide: ConfigService,
                    useClass: MockConfigService,
                },
            ],
        }).compile();

        service = module.get<HelperDateService>(HelperDateService);
        defTz = 'Asia/Jakarta';
    });

    afterAll(async () => {
        await module.close();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('calculateAge', () => {
        it('should calculate age correctly with birth date', () => {
            const dateOfBirth = new Date('1990-01-01');
            const age = service.calculateAge(dateOfBirth);
            expect(age).toBeGreaterThan(0);
        });

        it('should calculate age correctly with year', () => {
            const dateOfBirth = new Date('1990-01-01');
            const age = service.calculateAge(dateOfBirth, 1996);
            expect(age).toBeGreaterThan(0);
        });
    });

    describe('diff', () => {
        it('should return diff as days', () => {
            const dateOne = new Date('1990-01-01');
            const dateTwo = new Date('1990-01-02');

            const diff = service.diff(dateOne, dateTwo);
            expect(diff).toEqual(1);
        });

        it('should return diff as milliseconds', () => {
            const dateOne = new Date('1990-01-01');
            const dateTwo = new Date('1990-01-02');
            const opts: IHelperDateDiffOptions = {
                format: ENUM_HELPER_DATE_DIFF.MILIS,
            };

            const diff = service.diff(dateOne, dateTwo, opts);
            expect(diff).toBeGreaterThan(0);
        });

        it('should return diff as seconds', () => {
            const dateOne = new Date('1990-01-01');
            const dateTwo = new Date('1990-01-02');
            const opts: IHelperDateDiffOptions = {
                format: ENUM_HELPER_DATE_DIFF.SECONDS,
            };

            const diff = service.diff(dateOne, dateTwo, opts);
            expect(diff).toBeGreaterThan(0);
        });

        it('should return diff as hours', () => {
            const dateOne = new Date('1990-01-01');
            const dateTwo = new Date('1990-01-02');
            const opts: IHelperDateDiffOptions = {
                format: ENUM_HELPER_DATE_DIFF.HOURS,
            };

            const diff = service.diff(dateOne, dateTwo, opts);
            expect(diff).toBeGreaterThan(0);
        });

        it('should return diff as minutes', () => {
            const dateOne = new Date('1990-01-01');
            const dateTwo = new Date('1990-01-02');
            const opts: IHelperDateDiffOptions = {
                format: ENUM_HELPER_DATE_DIFF.MINUTES,
            };

            const diff = service.diff(dateOne, dateTwo, opts);
            expect(diff).toBeGreaterThan(0);
        });
    });

    describe('check', () => {
        it('should check format date correctly', () => {
            const isValid = service.check(new Date('2023-07-01'));
            expect(isValid).toBe(true);
        });
    });

    describe('checkIso', () => {
        it('should check iso date correctly', () => {
            const date = new Date().toISOString();
            expect(service.checkIso(date)).toBe(true);
        });
    });

    describe('checkTimestamp', () => {
        it('should check timestamp date correctly', () => {
            const date = new Date().getTime();
            expect(service.checkTimestamp(date)).toBe(true);
        });
    });

    describe('create', () => {
        it('should create date successfully', () => {
            const date = new Date();

            expect(service.create(date)).toEqual(moment(date).toDate());
        });

        it('should create undefined date successfully', () => {
            const date = service.create();

            expect(date).toBeDefined();
            expect(date).toBeInstanceOf(Date);
        });

        it('should create date start of day successfully', () => {
            const date = new Date();
            const opts: IHelperDateCreateOptions = {
                startOfDay: true,
            };

            expect(service.create(date, opts)).toEqual(
                moment(date).tz(defTz).startOf('day').toDate()
            );
        });
    });

    describe('createTimestamp', () => {
        it('should create timestamp successfully', () => {
            const date = new Date();

            expect(service.createTimestamp(date)).toEqual(
                moment(date).valueOf()
            );
        });

        it('should create undefined timestamp successfully', () => {
            const timestamp = service.createTimestamp();

            expect(timestamp).toBeDefined();
            expect(typeof timestamp).toEqual('number');
        });

        it('should create timestamp start of day successfully', () => {
            const date = new Date();
            const opts: IHelperDateCreateOptions = {
                startOfDay: true,
            };

            expect(service.createTimestamp(date, opts)).toEqual(
                moment(date).tz(defTz).startOf('day').valueOf()
            );
        });
    });

    describe('format', () => {
        it('should format successfully', () => {
            const date = new Date('2023-07-01');
            const result = date.toISOString().split('T')[0];
            const formattedDate = service.format(date);

            expect(formattedDate).toEqual(result);
        });

        it('should format with locale successfully', () => {
            const date = new Date('2023-07-01');
            const opts: IHelperDateFormatOptions = {
                locale: 'en',
            };

            const result = date.toISOString().split('T')[0];
            const formattedDate = service.format(date, opts);

            expect(formattedDate).toEqual(result);
        });
    });

    describe('formatIsoDurationFromMinutes', () => {
        it('should format iso duration from minutes successfully', () => {
            expect(service.formatIsoDurationFromMinutes(60)).toEqual('PT1H');
        });
    });

    describe('formatIsoDurationFromHours', () => {
        it('should format iso duration from hours successfully', () => {
            expect(service.formatIsoDurationFromHours(60)).toEqual('PT60H');
        });
    });

    describe('formatIsoDurationFromDays', () => {
        it('should format iso duration from days successfully', () => {
            expect(service.formatIsoDurationFromDays(60)).toEqual('P60D');
        });
    });

    describe('forwardInSeconds', () => {
        it('should forward in seconds successfully', () => {
            const now = moment().tz(defTz);

            expect(service.forwardInSeconds(60).valueOf()).toBeGreaterThan(
                now.unix()
            );
        });

        it('should forward in seconds with options successfully', () => {
            const now = moment().tz(defTz);
            const opts: IHelperDateForwardOptions = {
                fromDate: now.toDate(),
            };

            expect(
                service.forwardInSeconds(60, opts).valueOf()
            ).toBeGreaterThan(now.unix());
        });
    });

    describe('backwardInSeconds', () => {
        it('should backward date in seconds successfully', () => {
            const date = new Date();

            expect(service.backwardInSeconds(60).valueOf()).toBeLessThan(
                date.valueOf()
            );
        });

        it('should backward date in seconds with options successfully', () => {
            const now = moment().tz(defTz);
            const opts: IHelperDateForwardOptions = {
                fromDate: now.toDate(),
            };

            expect(service.backwardInSeconds(60, opts).valueOf()).toBeLessThan(
                now.toDate().valueOf()
            );
        });
    });

    describe('forwardInMinutes', () => {
        it('should forward minutes successfully', () => {
            const now = moment().tz(defTz);

            expect(service.forwardInMinutes(60).valueOf()).toBeGreaterThan(
                now.toDate().valueOf()
            );
        });

        it('should forward minutes with options successfully', () => {
            const now = moment().tz(defTz);
            const opts: IHelperDateForwardOptions = {
                fromDate: now.toDate(),
            };

            expect(
                service.forwardInMinutes(60, opts).valueOf()
            ).toBeGreaterThan(now.toDate().valueOf());
        });
    });

    describe('backwardInMinutes', () => {
        it('should backward date in minutes successfully', () => {
            const now = moment().tz(defTz);

            expect(service.backwardInMinutes(60).valueOf()).toBeLessThan(
                now.toDate().valueOf()
            );
        });

        it('should backward date in minutes with options successfully', () => {
            const now = moment().tz(defTz);
            const opts: IHelperDateForwardOptions = {
                fromDate: now.toDate(),
            };

            expect(service.backwardInMinutes(60, opts).valueOf()).toBeLessThan(
                now.toDate().valueOf()
            );
        });
    });

    describe('forwardInHours', () => {
        it('should forward hours successfully', () => {
            const now = moment().tz(defTz);

            expect(service.forwardInHours(60).valueOf()).toBeGreaterThan(
                now.toDate().valueOf()
            );
        });

        it('should forward hours with options successfully', () => {
            const now = moment().tz(defTz);
            const opts: IHelperDateForwardOptions = {
                fromDate: now.toDate(),
            };

            expect(service.forwardInHours(60, opts).valueOf()).toBeGreaterThan(
                now.toDate().valueOf()
            );
        });
    });

    describe('backwardInHours', () => {
        it('should backward date in hours successfully', () => {
            const now = moment().tz(defTz);

            expect(service.backwardInHours(60).valueOf()).toBeLessThan(
                now.toDate().valueOf()
            );
        });

        it('should backward date in hours with options successfully', () => {
            const now = moment().tz(defTz);
            const opts: IHelperDateForwardOptions = {
                fromDate: now.toDate(),
            };

            expect(service.backwardInHours(60, opts).valueOf()).toBeLessThan(
                now.toDate().valueOf()
            );
        });
    });

    describe('forwardInDays', () => {
        it('should forward days successfully', () => {
            const now = moment().tz(defTz);

            expect(service.forwardInDays(60).valueOf()).toBeGreaterThan(
                now.toDate().valueOf()
            );
        });

        it('should forward days with options successfully', () => {
            const now = moment().tz(defTz);
            const opts: IHelperDateForwardOptions = {
                fromDate: now.toDate(),
            };

            expect(service.forwardInDays(60, opts).valueOf()).toBeGreaterThan(
                now.toDate().valueOf()
            );
        });
    });

    describe('backwardInDays', () => {
        it('should backward date in days successfully', () => {
            const now = moment().tz(defTz);

            expect(service.backwardInDays(60).valueOf()).toBeLessThan(
                now.toDate().valueOf()
            );
        });

        it('should backward date in days with options successfully', () => {
            const now = moment().tz(defTz);
            const opts: IHelperDateForwardOptions = {
                fromDate: now.toDate(),
            };

            expect(service.backwardInDays(60, opts).valueOf()).toBeLessThan(
                now.toDate().valueOf()
            );
        });
    });

    describe('forwardInMonths', () => {
        it('should forward months successfully', () => {
            const now = moment().tz(defTz);

            expect(service.forwardInMonths(60).valueOf()).toBeGreaterThan(
                now.toDate().valueOf()
            );
        });

        it('should forward months with options successfully', () => {
            const now = moment().tz(defTz);
            const opts: IHelperDateForwardOptions = {
                fromDate: now.toDate(),
            };

            expect(service.forwardInMonths(60, opts).valueOf()).toBeGreaterThan(
                now.toDate().valueOf()
            );
        });
    });

    describe('backwardInMonths', () => {
        it('should backward date in months successfully', () => {
            const now = moment().tz(defTz);

            expect(service.backwardInMonths(60).valueOf()).toBeLessThan(
                now.toDate().valueOf()
            );
        });

        it('should backward date in months with options successfully', () => {
            const now = moment().tz(defTz);
            const opts: IHelperDateForwardOptions = {
                fromDate: now.toDate(),
            };

            expect(service.backwardInMonths(60, opts).valueOf()).toBeLessThan(
                now.toDate().valueOf()
            );
        });
    });

    describe('forwardInYears', () => {
        it('should forward years successfully', () => {
            const now = moment().tz(defTz);

            expect(service.forwardInYears(60).valueOf()).toBeGreaterThan(
                now.toDate().valueOf()
            );
        });

        it('should forward years with options successfully', () => {
            const now = moment().tz(defTz);
            const opts: IHelperDateForwardOptions = {
                fromDate: now.toDate(),
            };

            expect(service.forwardInYears(60, opts).valueOf()).toBeGreaterThan(
                now.toDate().valueOf()
            );
        });
    });

    describe('backwardInYears', () => {
        it('should backward date in years successfully', () => {
            const now = moment().tz(defTz);

            expect(service.backwardInYears(60).valueOf()).toBeLessThan(
                now.toDate().valueOf()
            );
        });

        it('should backward date in years with options successfully', () => {
            const now = moment().tz(defTz);
            const opts: IHelperDateForwardOptions = {
                fromDate: now.toDate(),
            };

            expect(service.backwardInYears(60, opts).valueOf()).toBeLessThan(
                now.toDate().valueOf()
            );
        });
    });

    describe('endOfMonth', () => {
        it('should change date to end of month successfully', () => {
            const now = new Date('2020-01-01');

            expect(service.endOfMonth(now).valueOf()).toBeGreaterThan(
                now.valueOf()
            );
        });
    });

    describe('startOfMonth', () => {
        it('should change date to start of month successfully', () => {
            const now = new Date('2020-01-30');

            expect(service.startOfMonth(now).valueOf()).toBeLessThan(
                now.valueOf()
            );
        });
    });

    describe('endOfYear', () => {
        it('should change date to end of year successfully', () => {
            const date = new Date('2024-01-01');

            expect(service.endOfYear(date).valueOf()).toBeGreaterThan(
                date.valueOf()
            );
        });
    });

    describe('startOfYear', () => {
        it('should change date to start of year successfully', () => {
            const now = new Date('2020-12-30');

            expect(service.startOfYear(now).valueOf()).toBeLessThan(
                now.valueOf()
            );
        });
    });

    describe('endOfDay', () => {
        it('should change date to end of day successfully', () => {
            const date = new Date();

            expect(service.endOfDay(date).valueOf()).toBeGreaterThan(
                date.valueOf()
            );
        });
    });

    describe('startOfDay', () => {
        it('should change date to start of day successfully', () => {
            const now = new Date();

            expect(service.startOfDay(now).valueOf()).toBeLessThan(
                now.valueOf()
            );
        });
    });

    describe('setTime', () => {
        it('should set time successfully', () => {
            const date = new Date();
            const opts: IHelperDateSetTimeOptions = {
                hour: 10,
                minute: 10,
                second: 10,
                millisecond: 10,
            };

            const result = moment(date)
                .tz(defTz)
                .set({
                    hour: opts.hour,
                    minute: opts.minute,
                    second: opts.second,
                    millisecond: opts.millisecond,
                })
                .toDate();

            expect(service.setTime(date, opts)).toEqual(result);
        });
    });

    describe('addTime', () => {
        it('should add time successfully', () => {
            const date = new Date();
            const opts: IHelperDateSetTimeOptions = {
                hour: 10,
                minute: 10,
                second: 10,
                millisecond: 10,
            };

            expect(service.addTime(date, opts).valueOf()).toBeGreaterThan(
                date.valueOf()
            );
        });
    });

    describe('subtractTime', () => {
        it('should subtract time successfully', () => {
            const date = new Date();
            const opts: IHelperDateSetTimeOptions = {
                hour: 10,
                minute: 10,
                second: 10,
                millisecond: 10,
            };

            expect(service.subtractTime(date, opts).valueOf()).toBeLessThan(
                date.valueOf()
            );
        });
    });

    describe('roundDown', () => {
        it('should round down date successfully', () => {
            const now = new Date();
            const opts: IHelperDateRoundDownOptions = {
                hour: true,
                millisecond: true,
                minute: true,
                second: true,
            };

            expect(service.roundDown(now, opts)).toEqual(
                moment(now).tz(defTz).startOf('days').toDate()
            );
        });
    });
});
