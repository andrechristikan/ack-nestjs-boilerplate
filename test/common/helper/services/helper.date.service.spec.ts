import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DateTime, Duration } from 'luxon';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumHelperDateDayOf } from '@common/helper/enums/helper.enum';

describe('HelperDateService', () => {
    const configGet = vi.fn<(key: string) => string | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let service: HelperDateService;

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.useFakeTimers();

        configGet.mockImplementation((key: string) =>
            key === 'app.timezone' ? 'Asia/Jakarta' : undefined
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HelperDateService,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        service = module.get(HelperDateService);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('calculateAge', () => {
        it('computes the duration since the date of birth as of tomorrow, zoned', () => {
            vi.setSystemTime(new Date('2026-01-14T00:00:00.000Z'));
            const dateOfBirth = new Date('2000-01-15T00:00:00.000Z');

            const result = service.calculateAge(dateOfBirth);

            expect(result).toBeInstanceOf(Duration);
            expect(result.as('years')).toBeCloseTo(26, 0);
        });

        it('anchors the calculation to a given year', () => {
            vi.setSystemTime(new Date('2026-01-14T00:00:00.000Z'));
            const dateOfBirth = new Date('2000-01-15T00:00:00.000Z');

            const result = service.calculateAge(dateOfBirth, 2010);

            expect(result.as('years')).toBeCloseTo(10, 0);
        });
    });

    describe('checkIso', () => {
        it('returns true for a valid ISO string', () => {
            expect(service.checkIso('2026-01-01T00:00:00.000Z')).toBe(true);
        });

        it('returns false for an invalid ISO string', () => {
            expect(service.checkIso('not-a-date')).toBe(false);
        });
    });

    describe('checkTimestamp', () => {
        it('returns true for a valid millisecond timestamp', () => {
            expect(service.checkTimestamp(Date.now())).toBe(true);
        });

        it('returns false for an invalid timestamp', () => {
            expect(service.checkTimestamp(Number.NaN)).toBe(false);
        });
    });

    describe('getZone', () => {
        it('returns the configured timezone name', () => {
            expect(service.getZone(new Date())).toBe('Asia/Jakarta');
        });
    });

    describe('getZoneOffset', () => {
        it('returns the short offset name of the configured timezone', () => {
            expect(service.getZoneOffset(new Date())).toBe('GMT+7');
        });

        it('falls back to UTC when the zone carries no short offset name', () => {
            vi.spyOn(
                DateTime.prototype,
                'offsetNameShort',
                'get'
            ).mockReturnValue(undefined as unknown as string);

            expect(service.getZoneOffset(new Date())).toBe('UTC');
        });
    });

    describe('getTimestamp', () => {
        it('returns the epoch millisecond instant of the date', () => {
            const date = new Date('2026-01-01T00:00:00.000Z');

            expect(service.getTimestamp(date)).toBe(date.getTime());
        });
    });

    describe('formatToRFC2822', () => {
        it('formats the date as RFC2822 in the configured timezone', () => {
            const date = new Date('2026-01-01T00:00:00.000Z');

            const result = service.formatToRFC2822(date);

            expect(result).toBe(
                DateTime.fromJSDate(date).setZone('Asia/Jakarta').toRFC2822()
            );
        });
    });

    describe('formatToIso', () => {
        it('formats the date as ISO in the configured timezone', () => {
            const date = new Date('2026-01-01T00:00:00.000Z');

            const result = service.formatToIso(date);

            expect(result).toBe(
                DateTime.fromJSDate(date).setZone('Asia/Jakarta').toISO()
            );
        });
    });

    describe('formatToIsoDate', () => {
        it('formats only the date portion in the configured timezone', () => {
            const date = new Date('2026-01-01T00:00:00.000Z');

            const result = service.formatToIsoDate(date);

            expect(result).toBe(
                DateTime.fromJSDate(date).setZone('Asia/Jakarta').toISODate()
            );
        });
    });

    describe('formatToIsoTime', () => {
        it('formats only the time portion in the configured timezone', () => {
            const date = new Date('2026-01-01T00:00:00.000Z');

            const result = service.formatToIsoTime(date);

            expect(result).toBe(
                DateTime.fromJSDate(date).setZone('Asia/Jakarta').toISOTime()
            );
        });
    });

    describe('create', () => {
        it('creates the current date when no date is given', () => {
            const now = new Date('2026-01-01T12:00:00.000Z');
            vi.setSystemTime(now);

            const result = service.create();

            expect(result.getTime()).toBe(
                DateTime.now().setZone('Asia/Jakarta').toJSDate().getTime()
            );
        });

        it('creates from a given date with no snapping', () => {
            const date = new Date('2026-01-01T12:34:56.000Z');

            const result = service.create(date);

            expect(result.getTime()).toBe(
                DateTime.fromJSDate(date)
                    .setZone('Asia/Jakarta')
                    .toJSDate()
                    .getTime()
            );
        });

        it('snaps to the start of day', () => {
            const date = new Date('2026-01-01T12:34:56.000Z');

            const result = service.create(date, {
                dayOf: EnumHelperDateDayOf.start,
            });

            expect(result.getTime()).toBe(
                DateTime.fromJSDate(date)
                    .setZone('Asia/Jakarta')
                    .startOf('day')
                    .toJSDate()
                    .getTime()
            );
        });

        it('snaps to the end of day', () => {
            const date = new Date('2026-01-01T12:34:56.000Z');

            const result = service.create(date, {
                dayOf: EnumHelperDateDayOf.end,
            });

            expect(result.getTime()).toBe(
                DateTime.fromJSDate(date)
                    .setZone('Asia/Jakarta')
                    .endOf('day')
                    .toJSDate()
                    .getTime()
            );
        });
    });

    describe('createInstance', () => {
        it('creates a DateTime instance from a given date', () => {
            const date = new Date('2026-01-01T00:00:00.000Z');

            const result = service.createInstance(date);

            expect(result).toBeInstanceOf(DateTime);
            expect(result.toJSDate().getTime()).toBe(date.getTime());
        });

        it('creates a DateTime instance for now when no date is given', () => {
            const now = new Date('2026-01-01T00:00:00.000Z');
            vi.setSystemTime(now);

            const result = service.createInstance();

            expect(result.toJSDate().getTime()).toBe(now.getTime());
        });
    });

    describe('createFromIso', () => {
        const iso = '2026-01-01T12:34:56.000Z';

        it('creates from an ISO string with no snapping', () => {
            const result = service.createFromIso(iso);

            expect(result.getTime()).toBe(
                DateTime.fromISO(iso)
                    .setZone('Asia/Jakarta')
                    .toJSDate()
                    .getTime()
            );
        });

        it('snaps to the start of day', () => {
            const result = service.createFromIso(iso, {
                dayOf: EnumHelperDateDayOf.start,
            });

            expect(result.getTime()).toBe(
                DateTime.fromISO(iso)
                    .setZone('Asia/Jakarta')
                    .startOf('day')
                    .toJSDate()
                    .getTime()
            );
        });

        it('snaps to the end of day', () => {
            const result = service.createFromIso(iso, {
                dayOf: EnumHelperDateDayOf.end,
            });

            expect(result.getTime()).toBe(
                DateTime.fromISO(iso)
                    .setZone('Asia/Jakarta')
                    .endOf('day')
                    .toJSDate()
                    .getTime()
            );
        });
    });

    describe('createFromTimestamp', () => {
        const timestamp = new Date('2026-01-01T12:34:56.000Z').getTime();

        it('creates the current date when no timestamp is given', () => {
            const now = new Date('2026-01-01T00:00:00.000Z');
            vi.setSystemTime(now);

            const result = service.createFromTimestamp();

            expect(result.getTime()).toBe(
                DateTime.now().setZone('Asia/Jakarta').toJSDate().getTime()
            );
        });

        it('creates from a given timestamp with no snapping', () => {
            const result = service.createFromTimestamp(timestamp);

            expect(result.getTime()).toBe(
                DateTime.fromMillis(timestamp)
                    .setZone('Asia/Jakarta')
                    .toJSDate()
                    .getTime()
            );
        });

        it('snaps to the start of day', () => {
            const result = service.createFromTimestamp(timestamp, {
                dayOf: EnumHelperDateDayOf.start,
            });

            expect(result.getTime()).toBe(
                DateTime.fromMillis(timestamp)
                    .setZone('Asia/Jakarta')
                    .startOf('day')
                    .toJSDate()
                    .getTime()
            );
        });

        it('snaps to the end of day', () => {
            const result = service.createFromTimestamp(timestamp, {
                dayOf: EnumHelperDateDayOf.end,
            });

            expect(result.getTime()).toBe(
                DateTime.fromMillis(timestamp)
                    .setZone('Asia/Jakarta')
                    .endOf('day')
                    .toJSDate()
                    .getTime()
            );
        });
    });

    describe('set', () => {
        it('sets the given units on the date, zoned', () => {
            const date = new Date('2026-01-01T00:00:00.000Z');

            const result = service.set(date, { hour: 5, minute: 30 });

            expect(result.getTime()).toBe(
                DateTime.fromJSDate(date)
                    .setZone('Asia/Jakarta')
                    .set({ hour: 5, minute: 30 })
                    .toJSDate()
                    .getTime()
            );
        });
    });

    describe('forward', () => {
        it('moves the date forward by the duration', () => {
            const date = new Date('2026-01-01T00:00:00.000Z');
            const duration = Duration.fromObject({ days: 3 });

            const result = service.forward(date, duration);

            expect(result.getTime()).toBe(
                DateTime.fromJSDate(date)
                    .setZone('Asia/Jakarta')
                    .plus(duration)
                    .toJSDate()
                    .getTime()
            );
        });
    });

    describe('backward', () => {
        it('moves the date backward by the duration', () => {
            const date = new Date('2026-01-01T00:00:00.000Z');
            const duration = Duration.fromObject({ days: 3 });

            const result = service.backward(date, duration);

            expect(result.getTime()).toBe(
                DateTime.fromJSDate(date)
                    .setZone('Asia/Jakarta')
                    .minus(duration)
                    .toJSDate()
                    .getTime()
            );
        });
    });

    describe('createDuration', () => {
        it('builds a Duration from a duration-like object', () => {
            const result = service.createDuration({ hours: 2 });

            expect(result).toBeInstanceOf(Duration);
            expect(result.as('hours')).toBe(2);
        });
    });

    describe('diff', () => {
        it('returns the zoned duration between two dates', () => {
            const dateOne = new Date('2026-01-03T00:00:00.000Z');
            const dateTwo = new Date('2026-01-01T00:00:00.000Z');

            const result = service.diff(dateOne, dateTwo);

            expect(result).toBeInstanceOf(Duration);
            expect(result.as('days')).toBe(2);
        });
    });
});
