import { Injectable } from '@nestjs/common';
import moment from 'moment';
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
    IHelperDateStartAndEnd,
    IHelperDateStartAndEndDate,
} from 'src/common/helper/interfaces/helper.interface';

@Injectable()
export class HelperDateService implements IHelperDateService {
    calculateAge(dateOfBirth: Date): number {
        return moment().diff(dateOfBirth, 'years');
    }

    diff(
        dateOne: Date,
        dateTwoMoreThanDateOne: Date,
        options?: IHelperDateOptionsDiff
    ): number {
        const mDateOne = moment(dateOne);
        const mDateTwo = moment(dateTwoMoreThanDateOne);
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
        return moment(date, true).isValid();
    }

    checkTimestamp(timestamp: number): boolean {
        return moment(timestamp, true).isValid();
    }

    create(
        date?: string | number | Date,
        options?: IHelperDateOptionsCreate
    ): Date {
        const mDate = moment(date ?? undefined);

        if (options?.startOfDay) {
            mDate.startOf('day');
        }

        return mDate.toDate();
    }

    timestamp(
        date?: string | number | Date,
        options?: IHelperDateOptionsCreate
    ): number {
        const mDate = moment(date ?? undefined);

        if (options?.startOfDay) {
            mDate.startOf('day');
        }

        return mDate.valueOf();
    }

    format(date: Date, options?: IHelperDateOptionsFormat): string {
        return moment(date).format(
            options?.format ?? ENUM_HELPER_DATE_FORMAT.DATE
        );
    }

    forwardInMilliseconds(
        milliseconds: number,
        options?: IHelperDateOptionsForward
    ): Date {
        return moment(options?.fromDate).add(milliseconds, 'ms').toDate();
    }

    backwardInMilliseconds(
        milliseconds: number,
        options?: IHelperDateOptionsBackward
    ): Date {
        return moment(options?.fromDate).subtract(milliseconds, 'ms').toDate();
    }

    forwardInSeconds(
        seconds: number,
        options?: IHelperDateOptionsForward
    ): Date {
        return moment(options?.fromDate).add(seconds, 's').toDate();
    }

    backwardInSeconds(
        seconds: number,
        options?: IHelperDateOptionsBackward
    ): Date {
        return moment(options?.fromDate).subtract(seconds, 's').toDate();
    }

    forwardInMinutes(
        minutes: number,
        options?: IHelperDateOptionsForward
    ): Date {
        return moment(options?.fromDate).add(minutes, 'm').toDate();
    }

    backwardInMinutes(
        minutes: number,
        options?: IHelperDateOptionsBackward
    ): Date {
        return moment(options?.fromDate).subtract(minutes, 'm').toDate();
    }

    forwardInHours(hours: number, options?: IHelperDateOptionsForward): Date {
        return moment(options?.fromDate).add(hours, 'h').toDate();
    }

    backwardInHours(hours: number, options?: IHelperDateOptionsBackward): Date {
        return moment(options?.fromDate).subtract(hours, 'h').toDate();
    }

    forwardInDays(days: number, options?: IHelperDateOptionsForward): Date {
        return moment(options?.fromDate).add(days, 'd').toDate();
    }

    backwardInDays(days: number, options?: IHelperDateOptionsBackward): Date {
        return moment(options?.fromDate).subtract(days, 'd').toDate();
    }

    forwardInMonths(months: number, options?: IHelperDateOptionsForward): Date {
        return moment(options?.fromDate).add(months, 'M').toDate();
    }

    backwardInMonths(
        months: number,
        options?: IHelperDateOptionsBackward
    ): Date {
        return moment(options?.fromDate).subtract(months, 'M').toDate();
    }

    endOfMonth(date?: Date): Date {
        return moment(date).endOf('month').toDate();
    }

    startOfMonth(date?: Date): Date {
        return moment(date).startOf('month').toDate();
    }

    endOfYear(date?: Date): Date {
        return moment(date).endOf('year').toDate();
    }

    startOfYear(date?: Date): Date {
        return moment(date).startOf('year').toDate();
    }

    endOfDay(date?: Date): Date {
        return moment(date).endOf('day').toDate();
    }

    startOfDay(date?: Date): Date {
        return moment(date).startOf('day').toDate();
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
        const mDate = moment(date).set({ millisecond: 0 });

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
        const today = moment();
        const todayMonth = Number(
            today.format(ENUM_HELPER_DATE_FORMAT.ONLY_MONTH)
        );
        const todayYear = Number(
            today.format(ENUM_HELPER_DATE_FORMAT.ONLY_YEAR)
        );

        // set month and year
        const year = options?.year ?? todayYear;
        const month = options?.month ?? todayMonth;

        const date = moment(`${year}-${month}-02`);
        let startDate: Date = date.startOf('year').toDate();
        let endDate: Date = date.endOf('year').toDate();

        if (options?.month) {
            const date = moment(`${year}-${month}-02`);
            startDate = date.startOf('month').toDate();
            endDate = date.endOf('month').toDate();
        }

        return {
            startDate,
            endDate,
        };
    }
}
