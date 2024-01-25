import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import moment, { ISO_8601 } from 'moment-timezone';
import {
    ENUM_HELPER_DATE_DIFF,
    ENUM_HELPER_DATE_FORMAT,
} from 'src/common/helper/constants/helper.enum.constant';
import { IHelperDateService } from 'src/common/helper/interfaces/helper.date-service.interface';
import {
    IHelperDateExtractDate,
    IHelperDateOptionsBackward,
    IHelperDateOptionsCreate,
    IHelperDateOptionsDiff,
    IHelperDateOptionsFormat,
    IHelperDateOptionsForward,
    IHelperDateOptionsRoundDown,
    IHelperDateSetTimeOptions,
    IHelperDateStartAndEnd,
    IHelperDateStartAndEndDate,
} from 'src/common/helper/interfaces/helper.interface';

@Injectable()
export class HelperDateService implements IHelperDateService {
    private readonly defTz: string;

    constructor(private readonly configService: ConfigService) {
        this.defTz = this.configService.get<string>('app.tz');
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
        options?: IHelperDateOptionsDiff
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

    checkDateTime(date: string | Date | number): boolean {
        return moment(date, ISO_8601, true).tz(this.defTz).isValid();
    }

    checkTimestamp(timestamp: number): boolean {
        return moment(timestamp, true).tz(this.defTz).isValid();
    }

    create(
        date?: string | number | Date,
        options?: IHelperDateOptionsCreate
    ): Date {
        const mDate = moment(date ?? undefined).tz(this.defTz);

        if (options?.startOfDay) {
            mDate.startOf('day');
        }

        return mDate.toDate();
    }

    timestamp(
        date?: string | number | Date,
        options?: IHelperDateOptionsCreate
    ): number {
        const mDate = moment(date ?? undefined).tz(this.defTz);

        if (options?.startOfDay) {
            mDate.startOf('day');
        }

        return mDate.valueOf();
    }

    format(date: Date, options?: IHelperDateOptionsFormat): string {
        return moment(date)
            .tz(this.defTz)
            .format(options?.format ?? ENUM_HELPER_DATE_FORMAT.DATE);
    }

    forwardInMilliseconds(
        milliseconds: number,
        options?: IHelperDateOptionsForward
    ): Date {
        return moment(options?.fromDate)
            .tz(this.defTz)
            .add(milliseconds, 'ms')
            .toDate();
    }

    backwardInMilliseconds(
        milliseconds: number,
        options?: IHelperDateOptionsBackward
    ): Date {
        return moment(options?.fromDate)
            .tz(this.defTz)
            .subtract(milliseconds, 'ms')
            .toDate();
    }

    forwardInSeconds(
        seconds: number,
        options?: IHelperDateOptionsForward
    ): Date {
        return moment(options?.fromDate)
            .tz(this.defTz)
            .add(seconds, 's')
            .toDate();
    }

    backwardInSeconds(
        seconds: number,
        options?: IHelperDateOptionsBackward
    ): Date {
        return moment(options?.fromDate)
            .tz(this.defTz)
            .subtract(seconds, 's')
            .toDate();
    }

    forwardInMinutes(
        minutes: number,
        options?: IHelperDateOptionsForward
    ): Date {
        return moment(options?.fromDate)
            .tz(this.defTz)
            .add(minutes, 'm')
            .toDate();
    }

    backwardInMinutes(
        minutes: number,
        options?: IHelperDateOptionsBackward
    ): Date {
        return moment(options?.fromDate)
            .tz(this.defTz)
            .subtract(minutes, 'm')
            .toDate();
    }

    forwardInHours(hours: number, options?: IHelperDateOptionsForward): Date {
        return moment(options?.fromDate)
            .tz(this.defTz)
            .add(hours, 'h')
            .toDate();
    }

    backwardInHours(hours: number, options?: IHelperDateOptionsBackward): Date {
        return moment(options?.fromDate)
            .tz(this.defTz)
            .subtract(hours, 'h')
            .toDate();
    }

    forwardInDays(days: number, options?: IHelperDateOptionsForward): Date {
        return moment(options?.fromDate).tz(this.defTz).add(days, 'd').toDate();
    }

    backwardInDays(days: number, options?: IHelperDateOptionsBackward): Date {
        return moment(options?.fromDate)
            .tz(this.defTz)
            .subtract(days, 'd')
            .toDate();
    }

    forwardInMonths(months: number, options?: IHelperDateOptionsForward): Date {
        return moment(options?.fromDate)
            .tz(this.defTz)
            .add(months, 'M')
            .toDate();
    }

    backwardInMonths(
        months: number,
        options?: IHelperDateOptionsBackward
    ): Date {
        return moment(options?.fromDate)
            .tz(this.defTz)
            .subtract(months, 'M')
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
        { hour, minute, second }: IHelperDateSetTimeOptions
    ): Date {
        return moment(date)
            .tz(this.defTz)
            .set({
                h: hour,
                m: minute,
                second: second,
                ms: 0,
            })
            .toDate();
    }

    addTime(
        date: Date,
        { hour, minute, second }: IHelperDateSetTimeOptions
    ): Date {
        return moment(date)
            .tz(this.defTz)
            .add({
                h: hour,
                m: minute,
                second: second,
            })
            .toDate();
    }

    minusTime(
        date: Date,
        { hour, minute, second }: IHelperDateSetTimeOptions
    ): Date {
        return moment(date)
            .tz(this.defTz)
            .subtract({
                h: hour,
                m: minute,
                second: second,
            })
            .toDate();
    }

    extractDate(date: string | Date | number): IHelperDateExtractDate {
        const newDate = this.create(date);
        const day: string = this.format(newDate, {
            format: ENUM_HELPER_DATE_FORMAT.ONLY_DATE,
        });
        const month: string = this.format(newDate, {
            format: ENUM_HELPER_DATE_FORMAT.ONLY_MONTH,
        });
        const year: string = this.format(newDate, {
            format: ENUM_HELPER_DATE_FORMAT.ONLY_YEAR,
        });

        return {
            date: newDate,
            day,
            month,
            year,
        };
    }

    roundDown(date: Date, options?: IHelperDateOptionsRoundDown): Date {
        const mDate = moment(date).tz(this.defTz).set({ millisecond: 0 });

        if (options?.hour) {
            mDate.set({ hour: 0 });
        }

        if (options?.minute) {
            mDate.set({ minute: 0 });
        }

        if (options?.second) {
            mDate.set({ second: 0 });
        }

        return mDate.toDate();
    }

    getStartAndEndDate(
        options?: IHelperDateStartAndEnd
    ): IHelperDateStartAndEndDate {
        const today = moment().tz(this.defTz);
        const todayMonth = today.format(ENUM_HELPER_DATE_FORMAT.ONLY_MONTH);
        const todayYear = today.format(ENUM_HELPER_DATE_FORMAT.ONLY_YEAR);
        // set month and year
        const year = options?.year ?? todayYear;
        const month = options?.month ?? todayMonth;

        const date = moment(`${year}-${month}-02`, 'YYYY-MM-DD').tz(this.defTz);
        let startDate: Date = date.startOf('month').toDate();
        let endDate: Date = date.endOf('month').toDate();

        if (options?.month) {
            const date = moment(`${year}-${month}-02`, 'YYYY-MM-DD').tz(
                this.defTz
            );
            startDate = date.startOf('month').toDate();
            endDate = date.endOf('month').toDate();
        }

        return {
            startDate,
            endDate,
        };
    }
}
