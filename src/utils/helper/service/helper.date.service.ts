import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import moment from 'moment-timezone';
import {
    ENUM_HELPER_DATE_DIFF,
    ENUM_HELPER_DATE_FORMAT,
} from '../helper.constant';
import {
    IHelperDateOptions,
    IHelperDateOptionsBackward,
    IHelperDateOptionsCreate,
    IHelperDateOptionsDiff,
    IHelperDateOptionsFormat,
    IHelperDateOptionsForward,
    IHelperDateOptionsMonth,
} from '../helper.interface';

@Injectable()
export class HelperDateService {
    private readonly timezone: string;

    constructor(private readonly configService: ConfigService) {
        this.timezone = this.configService.get<string>('app.timezone');
    }

    calculateAge(dateOfBirth: Date, options?: IHelperDateOptions): number {
        return moment
            .tz(options && options.timezone ? options.timezone : this.timezone)
            .diff(dateOfBirth, 'years');
    }

    diff(
        dateOne: Date,
        dateTwo: Date,
        options?: IHelperDateOptionsDiff
    ): number {
        const mDateOne = moment.tz(
            dateOne,
            options && options.timezone ? options.timezone : this.timezone
        );
        const mDateTwo = moment.tz(
            dateTwo,
            options && options.timezone ? options.timezone : this.timezone
        );
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

    check(date: string | Date | number, options?: IHelperDateOptions): boolean {
        return moment(date, true)
            .tz(options && options.timezone ? options.timezone : this.timezone)
            .isValid();
    }

    checkTimezone(timezone: string): boolean {
        return !!moment.tz.zone(timezone);
    }

    create(options?: IHelperDateOptionsCreate): Date {
        return moment
            .tz(
                options && options.date ? options.date : undefined,
                options && options.timezone ? options.timezone : this.timezone
            )
            .toDate();
    }

    timestamp(options?: IHelperDateOptionsCreate): number {
        return moment
            .tz(
                options && options.date ? options.date : undefined,
                options && options.timezone ? options.timezone : this.timezone
            )
            .valueOf();
    }

    format(date: Date, options?: IHelperDateOptionsFormat): string {
        return moment
            .tz(
                date,
                options && options.timezone ? options.timezone : this.timezone
            )
            .format(
                options && options.format
                    ? options.format
                    : ENUM_HELPER_DATE_FORMAT.DATE
            );
    }

    forwardInMinutes(
        minutes: number,
        options?: IHelperDateOptionsForward
    ): Date {
        return moment
            .tz(
                options && options.fromDate ? options.fromDate : undefined,
                options && options.timezone ? options.timezone : this.timezone
            )
            .add(minutes, 'm')
            .toDate();
    }

    backwardInMinutes(
        minutes: number,
        options?: IHelperDateOptionsBackward
    ): Date {
        return moment
            .tz(
                options && options.fromDate ? options.fromDate : undefined,
                options && options.timezone ? options.timezone : this.timezone
            )
            .subtract(minutes, 'm')
            .toDate();
    }

    forwardInDays(days: number, options?: IHelperDateOptionsForward): Date {
        return moment
            .tz(
                options && options.fromDate ? options.fromDate : undefined,
                options && options.timezone ? options.timezone : this.timezone
            )
            .add(days, 'd')
            .toDate();
    }

    backwardInDays(days: number, options?: IHelperDateOptionsBackward): Date {
        return moment
            .tz(
                options && options.fromDate ? options.fromDate : undefined,
                options && options.timezone ? options.timezone : this.timezone
            )
            .subtract(days, 'd')
            .toDate();
    }

    forwardInMonths(months: number, options?: IHelperDateOptionsForward): Date {
        return moment
            .tz(
                options && options.fromDate ? options.fromDate : undefined,
                options && options.timezone ? options.timezone : this.timezone
            )
            .add(months, 'M')
            .toDate();
    }

    backwardInMonths(
        months: number,
        options?: IHelperDateOptionsBackward
    ): Date {
        return moment
            .tz(
                options && options.fromDate ? options.fromDate : undefined,
                options && options.timezone ? options.timezone : this.timezone
            )
            .subtract(months, 'M')
            .toDate();
    }

    endOfMonth(month: number, options?: IHelperDateOptionsMonth): Date {
        const year =
            options && options.year
                ? options.year
                : moment
                      .tz(
                          options && options.timezone
                              ? options.timezone
                              : this.timezone
                      )
                      .year();
        return moment
            .tz(options && options.timezone ? options.timezone : this.timezone)
            .year(year)
            .month(month - 1)
            .endOf('month')
            .toDate();
    }

    startOfMonth(month: number, options?: IHelperDateOptionsMonth): Date {
        const year =
            options && options.year
                ? options.year
                : moment
                      .tz(
                          options && options.timezone
                              ? options.timezone
                              : this.timezone
                      )
                      .year();
        return moment
            .tz(options && options.timezone ? options.timezone : this.timezone)
            .year(year)
            .month(month - 1)
            .startOf('month')
            .toDate();
    }

    endOfYear(year: number, options?: IHelperDateOptions): Date {
        return moment
            .tz(options && options.timezone ? options.timezone : this.timezone)
            .year(year)
            .endOf('year')
            .toDate();
    }

    startOfYear(year: number, options?: IHelperDateOptions): Date {
        return moment
            .tz(options && options.timezone ? options.timezone : this.timezone)
            .year(year)
            .startOf('year')
            .toDate();
    }
}
