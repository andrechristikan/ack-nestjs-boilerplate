import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import moment, { ISO_8601 } from 'moment-timezone';
import {
    ENUM_HELPER_DATE_DIFF,
    ENUM_HELPER_DATE_FORMAT,
} from 'src/common/helper/enums/helper.enum';
import { IHelperDateService } from 'src/common/helper/interfaces/helper.date-service.interface';
import {
    IHelperDateSetTimeOptions,
    IHelperDateFormatOptions,
    IHelperDateDiffOptions,
    IHelperDateCreateOptions,
    IHelperDateForwardOptions,
    IHelperDateBackwardOptions,
    IHelperDateRoundDownOptions,
} from 'src/common/helper/interfaces/helper.interface';

@Injectable()
export class HelperDateService implements IHelperDateService {
    private readonly defTz: string;

    constructor(private readonly configService: ConfigService) {
        this.defTz = this.configService.get<string>('app.timezone');
    }

    calculateAge(dateOfBirth: Date, year?: number): number {
        const m = moment().tz(this.defTz);

        if (year) {
            m.set('year', year);
        }

        return m.diff(dateOfBirth, 'years');
    }

    diff(
        dateOne: Date,
        dateTwoMoreThanDateOne: Date,
        options?: IHelperDateDiffOptions
    ): number {
        const mDateOne = moment(dateOne).tz(this.defTz);
        const mDateTwo = moment(dateTwoMoreThanDateOne).tz(this.defTz);
        const diff = moment.duration(mDateTwo.diff(mDateOne));

        if (options?.format === ENUM_HELPER_DATE_DIFF.MILIS) {
            return diff.asMilliseconds();
        } else if (options?.format === ENUM_HELPER_DATE_DIFF.SECONDS) {
            return diff.asSeconds();
        } else if (options?.format === ENUM_HELPER_DATE_DIFF.HOURS) {
            return diff.asHours();
        } else if (options?.format === ENUM_HELPER_DATE_DIFF.MINUTES) {
            return diff.asMinutes();
        } else {
            return diff.asDays();
        }
    }

    check(date: string | Date | number): boolean {
        return moment(date, 'YYYY-MM-DD', true).tz(this.defTz).isValid();
    }

    checkIso(date: string | Date | number): boolean {
        return moment(date, ISO_8601, true).tz(this.defTz).isValid();
    }

    checkTimestamp(timestamp: number): boolean {
        return moment(timestamp, true).tz(this.defTz).isValid();
    }

    create(
        date?: string | number | Date,
        options?: IHelperDateCreateOptions
    ): Date {
        const mDate = moment(date ?? undefined).tz(this.defTz);

        if (options?.startOfDay) {
            mDate.startOf('day');
        }

        return mDate.toDate();
    }

    createTimestamp(
        date?: string | number | Date,
        options?: IHelperDateCreateOptions
    ): number {
        const mDate = moment(date ?? undefined).tz(this.defTz);

        if (options?.startOfDay) {
            mDate.startOf('day');
        }

        return mDate.valueOf();
    }

    format(date: Date, options?: IHelperDateFormatOptions): string {
        if (options?.locale) {
            moment.locale(options.locale);
        }

        return moment(date)
            .tz(this.defTz)
            .format(options?.format ?? ENUM_HELPER_DATE_FORMAT.DATE);
    }

    formatIsoDurationFromMinutes(minutes: number): string {
        return moment.duration(minutes, 'minutes').toISOString();
    }

    formatIsoDurationFromHours(hours: number): string {
        return moment.duration(hours, 'hours').toISOString();
    }

    formatIsoDurationFromDays(days: number): string {
        return moment.duration(days, 'days').toISOString();
    }

    forwardInSeconds(
        seconds: number,
        options?: IHelperDateForwardOptions
    ): Date {
        return moment(options?.fromDate)
            .tz(this.defTz)
            .add(seconds, 'seconds')
            .toDate();
    }

    backwardInSeconds(
        seconds: number,
        options?: IHelperDateBackwardOptions
    ): Date {
        return moment(options?.fromDate)
            .tz(this.defTz)
            .subtract(seconds, 'seconds')
            .toDate();
    }

    forwardInMinutes(
        minutes: number,
        options?: IHelperDateForwardOptions
    ): Date {
        return moment(options?.fromDate)
            .tz(this.defTz)
            .add(minutes, 'minutes')
            .toDate();
    }

    backwardInMinutes(
        minutes: number,
        options?: IHelperDateBackwardOptions
    ): Date {
        return moment(options?.fromDate)
            .tz(this.defTz)
            .subtract(minutes, 'minutes')
            .toDate();
    }

    forwardInHours(hours: number, options?: IHelperDateForwardOptions): Date {
        return moment(options?.fromDate)
            .tz(this.defTz)
            .add(hours, 'hours')
            .toDate();
    }

    backwardInHours(hours: number, options?: IHelperDateBackwardOptions): Date {
        return moment(options?.fromDate)
            .tz(this.defTz)
            .subtract(hours, 'hours')
            .toDate();
    }

    forwardInDays(days: number, options?: IHelperDateForwardOptions): Date {
        return moment(options?.fromDate).tz(this.defTz).add(days, 'd').toDate();
    }

    backwardInDays(days: number, options?: IHelperDateBackwardOptions): Date {
        return moment(options?.fromDate)
            .tz(this.defTz)
            .subtract(days, 'days')
            .toDate();
    }

    forwardInMonths(months: number, options?: IHelperDateForwardOptions): Date {
        return moment(options?.fromDate)
            .tz(this.defTz)
            .add(months, 'months')
            .toDate();
    }

    backwardInMonths(
        months: number,
        options?: IHelperDateBackwardOptions
    ): Date {
        return moment(options?.fromDate)
            .tz(this.defTz)
            .subtract(months, 'months')
            .toDate();
    }

    forwardInYears(years: number, options?: IHelperDateForwardOptions): Date {
        return moment(options?.fromDate)
            .tz(this.defTz)
            .add(years, 'years')
            .toDate();
    }

    backwardInYears(years: number, options?: IHelperDateBackwardOptions): Date {
        return moment(options?.fromDate)
            .tz(this.defTz)
            .subtract(years, 'years')
            .toDate();
    }

    endOfMonth(date?: Date): Date {
        return moment(date).tz(this.defTz).endOf('month').toDate();
    }

    startOfMonth(date?: Date): Date {
        return moment(date).tz(this.defTz).startOf('month').toDate();
    }

    endOfYear(date?: Date): Date {
        return moment(date).tz(this.defTz).endOf('year').toDate();
    }

    startOfYear(date?: Date): Date {
        return moment(date).tz(this.defTz).startOf('year').toDate();
    }

    endOfDay(date?: Date): Date {
        return moment(date).tz(this.defTz).endOf('day').toDate();
    }

    startOfDay(date?: Date): Date {
        return moment(date).tz(this.defTz).startOf('day').toDate();
    }

    setTime(
        date: Date,
        { hour, minute, second, millisecond }: IHelperDateSetTimeOptions
    ): Date {
        return moment(date)
            .tz(this.defTz)
            .set({
                hour: hour,
                minute: minute,
                second: second,
                millisecond: millisecond,
            })
            .toDate();
    }

    addTime(
        date: Date,
        { hour, minute, second, millisecond }: IHelperDateSetTimeOptions
    ): Date {
        return moment(date)
            .tz(this.defTz)
            .add({
                hour: hour,
                minute: minute,
                second: second,
                millisecond: millisecond,
            })
            .toDate();
    }

    subtractTime(
        date: Date,
        { hour, minute, second }: IHelperDateSetTimeOptions
    ): Date {
        return moment(date)
            .tz(this.defTz)
            .subtract({
                hour: hour,
                minute: minute,
                second: second,
            })
            .toDate();
    }

    roundDown(date: Date, options?: IHelperDateRoundDownOptions): Date {
        const mDate = moment(date).tz(this.defTz);

        if (options?.hour) {
            mDate.set({ hour: 0 });
        }

        if (options?.minute) {
            mDate.set({ minute: 0 });
        }

        if (options?.second) {
            mDate.set({ second: 0 });
        }

        if (options?.millisecond) {
            mDate.set({ millisecond: 0 });
        }

        return mDate.toDate();
    }
}
