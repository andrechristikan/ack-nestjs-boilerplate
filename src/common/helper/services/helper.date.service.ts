import { EnumHelperDateDayOf } from '@common/helper/enums/helper.enum';
import { IHelperDateCreateOptions } from '@common/helper/interfaces/helper.interface';
import { IHelperDateService } from '@common/helper/interfaces/helper.date.service.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DateObjectUnits, DateTime, Duration, DurationLikeObject } from 'luxon';

@Injectable()
export class HelperDateService implements IHelperDateService {
    private readonly defTz: string;

    constructor(private readonly configService: ConfigService) {
        this.defTz = this.configService.get<string>('app.timezone')!;
    }

    calculateAge(dateOfBirth: Date, fromYear?: number): Duration {
        let dateTime = DateTime.now()
            .setZone(this.defTz)
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
            .setZone(this.defTz)
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
        return DateTime.fromISO(date).setZone(this.defTz).isValid;
    }

    checkTimestamp(timestamp: number): boolean {
        return DateTime.fromMillis(timestamp).setZone(this.defTz).isValid;
    }

    getZone(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.defTz).zone.name;
    }

    getZoneOffset(date: Date): string {
        return (
            DateTime.fromJSDate(date).setZone(this.defTz).offsetNameShort ??
            'UTC'
        );
    }

    getTimestamp(date: Date): number {
        return DateTime.fromJSDate(date).setZone(this.defTz).toMillis();
    }

    formatToRFC2822(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.defTz).toRFC2822()!;
    }

    formatToIso(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.defTz).toISO()!;
    }

    formatToIsoDate(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.defTz).toISODate()!;
    }

    formatToIsoTime(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.defTz).toISOTime()!;
    }

    create(date?: Date, options?: IHelperDateCreateOptions): Date {
        let mDate = date
            ? DateTime.fromJSDate(date).setZone(this.defTz)
            : DateTime.now().setZone(this.defTz);

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
        let date = DateTime.fromISO(iso).setZone(this.defTz);

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
            ? DateTime.fromMillis(timestamp).setZone(this.defTz)
            : DateTime.now().setZone(this.defTz);

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
            .setZone(this.defTz)
            .set(units)
            .toJSDate();
    }

    forward(date: Date, duration: Duration): Date {
        return DateTime.fromJSDate(date)
            .setZone(this.defTz)
            .plus(duration)
            .toJSDate();
    }

    backward(date: Date, duration: Duration): Date {
        return DateTime.fromJSDate(date)
            .setZone(this.defTz)
            .minus(duration)
            .toJSDate();
    }

    createDuration(duration: DurationLikeObject): Duration {
        return Duration.fromObject(duration);
    }

    diff(dateOne: Date, dateTwo: Date): Duration {
        const dOne = DateTime.fromJSDate(dateOne).setZone(this.defTz);
        const dTwo = DateTime.fromJSDate(dateTwo).setZone(this.defTz);

        return dOne.diff(dTwo);
    }
}
