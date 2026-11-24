import { EnumHelperDateDayOf } from '@common/helper/enums/helper.enum';
import type { IHelperDateCreateOptions } from '@common/helper/interfaces/helper.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DateTime, Duration } from 'luxon';
import type { DateObjectUnits, DurationLikeObject } from 'luxon';

@Injectable()
export class HelperDateService {
    private readonly timezone: string;

    constructor(private readonly configService: ConfigService) {
        this.timezone = this.configService.get<string>('app.timezone')!;
    }

    private snapDayOf(
        dateTime: DateTime,
        options?: IHelperDateCreateOptions
    ): Date {
        let mDate = dateTime.setZone(this.timezone);

        if (options?.dayOf === EnumHelperDateDayOf.start) {
            mDate = mDate.startOf('day');
        } else if (options?.dayOf === EnumHelperDateDayOf.end) {
            mDate = mDate.endOf('day');
        }

        return mDate.toJSDate();
    }

    /** Counts the age to the current year when `fromYear` is `null`. */
    calculateAge(dateOfBirth: Date, fromYear: number | null): Duration {
        const now = this.now();
        let dateTime = DateTime.fromJSDate(now)
            .setZone(this.timezone)
            .plus({
                day: 1,
            })
            .set({
                hour: 0,
                minute: 0,
                second: 0,
                millisecond: 0,
            });
        const dateTimeDob = DateTime.fromJSDate(dateOfBirth)
            .setZone(this.timezone)
            .set({
                hour: 0,
                minute: 0,
                second: 0,
                millisecond: 0,
            });

        if (fromYear !== null) {
            dateTime = dateTime.set({ year: fromYear });
        }

        return dateTime.diff(dateTimeDob);
    }

    checkIso(date: string): boolean {
        return DateTime.fromISO(date).setZone(this.timezone).isValid;
    }

    checkTimestamp(timestamp: number): boolean {
        return DateTime.fromMillis(timestamp).setZone(this.timezone).isValid;
    }

    getZone(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.timezone).zone.name;
    }

    getHour(date: Date): number {
        return DateTime.fromJSDate(date).setZone(this.timezone).hour;
    }

    getZoneOffset(date: Date): string {
        return (
            DateTime.fromJSDate(date).setZone(this.timezone).offsetNameShort ??
            'UTC'
        );
    }

    getTimestamp(date: Date): number {
        return DateTime.fromJSDate(date).setZone(this.timezone).toMillis();
    }

    formatToRfc2822(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.timezone).toRFC2822()!;
    }

    formatToIso(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.timezone).toISO()!;
    }

    formatToIsoDate(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.timezone).toISODate()!;
    }

    formatToIsoTime(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.timezone).toISOTime()!;
    }

    now(options?: IHelperDateCreateOptions): Date {
        return this.snapDayOf(DateTime.now(), options);
    }

    create(date: Date, options?: IHelperDateCreateOptions): Date {
        return this.snapDayOf(DateTime.fromJSDate(date), options);
    }

    createFromIso(iso: string, options?: IHelperDateCreateOptions): Date {
        return this.snapDayOf(DateTime.fromISO(iso), options);
    }

    createFromTimestamp(
        timestamp: number,
        options?: IHelperDateCreateOptions
    ): Date {
        return this.snapDayOf(DateTime.fromMillis(timestamp), options);
    }

    set(date: Date, units: DateObjectUnits): Date {
        return DateTime.fromJSDate(date)
            .setZone(this.timezone)
            .set(units)
            .toJSDate();
    }

    forward(date: Date, duration: Duration): Date {
        return DateTime.fromJSDate(date)
            .setZone(this.timezone)
            .plus(duration)
            .toJSDate();
    }

    backward(date: Date, duration: Duration): Date {
        return DateTime.fromJSDate(date)
            .setZone(this.timezone)
            .minus(duration)
            .toJSDate();
    }

    createDuration(duration: DurationLikeObject): Duration {
        return Duration.fromObject(duration);
    }

    diff(dateOne: Date, dateTwo: Date): Duration {
        const dOne = DateTime.fromJSDate(dateOne).setZone(this.timezone);
        const dTwo = DateTime.fromJSDate(dateTwo).setZone(this.timezone);

        return dOne.diff(dTwo);
    }
}
