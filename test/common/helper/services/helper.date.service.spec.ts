import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EnumHelperDateDayOf } from '@common/helper/enums/helper.enum';
import { HelperDateService } from '@common/helper/services/helper.date.service';

describe('HelperDateService', () => {
    // Asia/Jakarta is UTC+7 with no DST, so a zone bug shifts the day.
    const configService = new ConfigService({ 'app.timezone': 'Asia/Jakarta' });
    const instant = new Date('2026-03-10T20:30:15.500Z'); // 2026-03-11 03:30 in Jakarta

    let service: HelperDateService;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(instant);
        service = new HelperDateService(configService);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('validation', () => {
        it('checkIso accepts ISO and rejects garbage', () => {
            expect(service.checkIso('2026-03-10T00:00:00Z')).toBe(true);
            expect(service.checkIso('not-a-date')).toBe(false);
        });

        it('checkTimestamp accepts finite millis and rejects out-of-range', () => {
            expect(service.checkTimestamp(0)).toBe(true);
            expect(service.checkTimestamp(Number.NaN)).toBe(false);
            expect(service.checkTimestamp(8.64e15 + 1)).toBe(false);
        });
    });

    describe('zone and formatting', () => {
        it('reports the configured zone and offset name', () => {
            expect(service.getZone(instant)).toBe('Asia/Jakarta');
            expect(service.getZoneOffset(instant)).toBe('GMT+7');
        });

        it('getTimestamp returns epoch millis', () => {
            expect(service.getTimestamp(instant)).toBe(instant.getTime());
        });

        it('formats in the configured zone', () => {
            expect(service.formatToIso(instant)).toBe(
                '2026-03-11T03:30:15.500+07:00'
            );
            expect(service.formatToIsoDate(instant)).toBe('2026-03-11');
            expect(service.formatToIsoTime(instant)).toBe('03:30:15.500+07:00');
            expect(service.formatToRFC2822(instant)).toBe(
                'Wed, 11 Mar 2026 03:30:15 +0700'
            );
        });
    });

    describe('create', () => {
        it('uses now when no date is given', () => {
            expect(service.create()).toEqual(instant);
        });

        it('returns the same instant when no dayOf is given', () => {
            const date = new Date('2026-01-01T05:00:00.000Z');

            expect(service.create(date)).toEqual(date);
        });

        it('snaps to the start of the day in the configured zone', () => {
            expect(
                service.create(instant, { dayOf: EnumHelperDateDayOf.start })
            ).toEqual(new Date('2026-03-10T17:00:00.000Z'));
        });

        it('snaps to the end of the day in the configured zone', () => {
            expect(
                service.create(instant, { dayOf: EnumHelperDateDayOf.end })
            ).toEqual(new Date('2026-03-11T16:59:59.999Z'));
        });

        it('createInstance wraps the given date or now', () => {
            expect(service.createInstance(instant).toMillis()).toBe(
                instant.getTime()
            );
            expect(service.createInstance().toMillis()).toBe(instant.getTime());
        });
    });

    describe('createFromIso', () => {
        const iso = '2026-03-10T20:30:15.500Z';

        it('parses the instant', () => {
            expect(service.createFromIso(iso)).toEqual(instant);
        });

        it('honours dayOf start and end in the configured zone', () => {
            expect(
                service.createFromIso(iso, {
                    dayOf: EnumHelperDateDayOf.start,
                })
            ).toEqual(new Date('2026-03-10T17:00:00.000Z'));
            expect(
                service.createFromIso(iso, { dayOf: EnumHelperDateDayOf.end })
            ).toEqual(new Date('2026-03-11T16:59:59.999Z'));
        });
    });

    describe('createFromTimestamp', () => {
        it('parses the given millis', () => {
            expect(service.createFromTimestamp(instant.getTime())).toEqual(
                instant
            );
        });

        it('falls back to now when the timestamp is missing', () => {
            expect(service.createFromTimestamp()).toEqual(instant);
        });

        it('honours dayOf start and end in the configured zone', () => {
            expect(
                service.createFromTimestamp(instant.getTime(), {
                    dayOf: EnumHelperDateDayOf.start,
                })
            ).toEqual(new Date('2026-03-10T17:00:00.000Z'));
            expect(
                service.createFromTimestamp(instant.getTime(), {
                    dayOf: EnumHelperDateDayOf.end,
                })
            ).toEqual(new Date('2026-03-11T16:59:59.999Z'));
        });
    });

    describe('arithmetic', () => {
        it('set applies units in the configured zone', () => {
            expect(service.set(instant, { hour: 0, minute: 0 })).toEqual(
                new Date('2026-03-10T17:00:15.500Z')
            );
        });

        it('forward adds and backward subtracts a duration', () => {
            const duration = service.createDuration({ days: 2, hours: 1 });

            expect(service.forward(instant, duration)).toEqual(
                new Date('2026-03-12T21:30:15.500Z')
            );
            expect(service.backward(instant, duration)).toEqual(
                new Date('2026-03-08T19:30:15.500Z')
            );
        });

        it('createDuration builds a luxon Duration', () => {
            const duration = service.createDuration({ minutes: 90 });

            expect(duration).toBeInstanceOf(Duration);
            expect(duration.as('hours')).toBe(1.5);
        });

        it('diff is dateOne minus dateTwo in millis', () => {
            const later = new Date(instant.getTime() + 5000);

            expect(service.diff(later, instant).as('milliseconds')).toBe(5000);
            expect(service.diff(instant, later).as('milliseconds')).toBe(-5000);
        });
    });

    describe('calculateAge', () => {
        it('measures from the start of tomorrow to the start of the birth day', () => {
            const dob = new Date('2026-03-08T20:00:00.000Z'); // 03-09 03:00 Jakarta

            // tomorrow 00:00 Jakarta = 03-12; dob day start = 03-09 => 3 days
            expect(service.calculateAge(dob).as('days')).toBe(3);
        });

        it('replaces the reference year when fromYear is given', () => {
            const dob = new Date('2000-03-10T20:00:00.000Z'); // 2000-03-11 Jakarta
            // reference = tomorrow (03-12) forced to 2010; dob day start = 2000-03-11
            const age = service.calculateAge(dob, 2010);

            expect(age.as('days')).toBe(3653);
        });
    });
});
