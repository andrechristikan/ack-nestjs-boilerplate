import { Injectable } from '@nestjs/common';
import moment from 'moment';
import {
    ENUM_HELPER_DATE_DIFF,
    ENUM_HELPER_DATE_FORMAT,
} from 'src/common/helper/constants/helper.enum.constant';
import { IHelperDateService } from 'src/common/helper/interfaces/helper.date-service.interface';
import {
    IHelperDateOptionsBackward,
    IHelperDateOptionsCreate,
    IHelperDateOptionsDiff,
    IHelperDateOptionsFormat,
    IHelperDateOptionsForward,
    IHelperDateOptionsMonth,
} from 'src/common/helper/interfaces/helper.interface';

@Injectable()
export class HelperDateService implements IHelperDateService {
    calculateAge(dateOfBirth: Date): number {
        return moment().diff(dateOfBirth, 'years');
    }

    diff(
        dateOne: Date,
        dateTwo: Date,
        options?: IHelperDateOptionsDiff
    ): number {
        const mDateOne = moment(dateOne);
        const mDateTwo = moment(dateTwo);
        const diff = moment.duration(mDateTwo.diff(mDateOne));

        if (options && options.format === ENUM_HELPER_DATE_DIFF.MILIS) {
            return diff.asMilliseconds();
        } else if (
            options &&
            options.format === ENUM_HELPER_DATE_DIFF.SECONDS
        ) {
            return diff.asSeconds();
        } else if (options && options.format === ENUM_HELPER_DATE_DIFF.HOURS) {
            return diff.asHours();
        } else if (
            options &&
            options.format === ENUM_HELPER_DATE_DIFF.MINUTES
        ) {
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

    create(options?: IHelperDateOptionsCreate): Date {
        return moment(
            options && options.date ? options.date : undefined
        ).toDate();
    }

    timestamp(options?: IHelperDateOptionsCreate): number {
        return moment(
            options && options.date ? options.date : undefined
        ).valueOf();
    }

    format(date: Date, options?: IHelperDateOptionsFormat): string {
        return moment(date).format(
            options && options.format
                ? options.format
                : ENUM_HELPER_DATE_FORMAT.DATE
        );
    }

    forwardInMilliseconds(
        milliseconds: number,
        options?: IHelperDateOptionsForward
    ): Date {
        return moment(
            options && options.fromDate ? options.fromDate : undefined
        )
            .add(milliseconds, 'ms')
            .toDate();
    }

    backwardInMilliseconds(
        milliseconds: number,
        options?: IHelperDateOptionsBackward
    ): Date {
        return moment(
            options && options.fromDate ? options.fromDate : undefined
        )
            .subtract(milliseconds, 'ms')
            .toDate();
    }

    forwardInSeconds(
        seconds: number,
        options?: IHelperDateOptionsForward
    ): Date {
        return moment(
            options && options.fromDate ? options.fromDate : undefined
        )
            .add(seconds, 's')
            .toDate();
    }

    backwardInSeconds(
        seconds: number,
        options?: IHelperDateOptionsBackward
    ): Date {
        return moment(
            options && options.fromDate ? options.fromDate : undefined
        )
            .subtract(seconds, 's')
            .toDate();
    }

    forwardInMinutes(
        minutes: number,
        options?: IHelperDateOptionsForward
    ): Date {
        return moment(
            options && options.fromDate ? options.fromDate : undefined
        )
            .add(minutes, 'm')
            .toDate();
    }

    backwardInMinutes(
        minutes: number,
        options?: IHelperDateOptionsBackward
    ): Date {
        return moment(
            options && options.fromDate ? options.fromDate : undefined
        )
            .subtract(minutes, 'm')
            .toDate();
    }

    forwardInDays(days: number, options?: IHelperDateOptionsForward): Date {
        return moment(
            options && options.fromDate ? options.fromDate : undefined
        )
            .add(days, 'd')
            .toDate();
    }

    backwardInDays(days: number, options?: IHelperDateOptionsBackward): Date {
        return moment(
            options && options.fromDate ? options.fromDate : undefined
        )
            .subtract(days, 'd')
            .toDate();
    }

    forwardInMonths(months: number, options?: IHelperDateOptionsForward): Date {
        return moment(
            options && options.fromDate ? options.fromDate : undefined
        )
            .add(months, 'M')
            .toDate();
    }

    backwardInMonths(
        months: number,
        options?: IHelperDateOptionsBackward
    ): Date {
        return moment(
            options && options.fromDate ? options.fromDate : undefined
        )
            .subtract(months, 'M')
            .toDate();
    }

    endOfMonth(month: number, options?: IHelperDateOptionsMonth): Date {
        const year = options && options.year ? options.year : moment().year();
        return moment()
            .year(year)
            .month(month - 1)
            .endOf('month')
            .toDate();
    }

    startOfMonth(month: number, options?: IHelperDateOptionsMonth): Date {
        const year = options && options.year ? options.year : moment().year();
        return moment()
            .year(year)
            .month(month - 1)
            .startOf('month')
            .toDate();
    }

    endOfYear(year: number): Date {
        return moment().year(year).endOf('year').toDate();
    }

    startOfYear(year: number): Date {
        return moment().year(year).startOf('year').toDate();
    }

    endOfDay(date?: Date): Date {
        return moment(date).endOf('day').toDate();
    }

    startOfDay(date?: Date): Date {
        return moment(date).startOf('day').toDate();
    }
}
