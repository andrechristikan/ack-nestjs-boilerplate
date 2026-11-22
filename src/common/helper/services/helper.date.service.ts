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

    calculateAge(dateOfBirth: Date, fromYear?: number): Duration {
        let dateTime = DateTime.now()
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

        if (fromYear) {
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

    formatToRFC2822(date: Date): string {
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

    create(date?: Date, options?: IHelperDateCreateOptions): Date {
        let mDate = (date ? DateTime.fromJSDate(date) : DateTime.now()).setZone(
            this.timezone
        );

        if (options?.dayOf && options?.dayOf === EnumHelperDateDayOf.start) {
            mDate = mDate.startOf('day');
        } else if (
            options?.dayOf &&
            options?.dayOf === EnumHelperDateDayOf.end
        ) {
            mDate = mDate.endOf('day');
        }

        return mDate.toJSDate();
    }

    createInstance(date?: Date): DateTime {
        return date ? DateTime.fromJSDate(date) : DateTime.now();
    }

    createFromIso(iso: string, options?: IHelperDateCreateOptions): Date {
        let date = DateTime.fromISO(iso).setZone(this.timezone);

        if (options?.dayOf && options?.dayOf === EnumHelperDateDayOf.start) {
            date = date.startOf('day');
        } else if (
            options?.dayOf &&
            options?.dayOf === EnumHelperDateDayOf.end
        ) {
            date = date.endOf('day');
        }

        return date.toJSDate();
    }

    createFromTimestamp(
        timestamp?: number,
        options?: IHelperDateCreateOptions
    ): Date {
        let date = timestamp
            ? DateTime.fromMillis(timestamp).setZone(this.timezone)
            : DateTime.now().setZone(this.timezone);

        if (options?.dayOf && options?.dayOf === EnumHelperDateDayOf.start) {
            date = date.startOf('day');
        } else if (
            options?.dayOf &&
            options?.dayOf === EnumHelperDateDayOf.end
        ) {
            date = date.endOf('day');
        }

        return date.toJSDate();
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
