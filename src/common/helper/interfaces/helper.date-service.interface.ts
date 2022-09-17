import {
    IHelperDateOptions,
    IHelperDateOptionsBackward,
    IHelperDateOptionsCreate,
    IHelperDateOptionsDiff,
    IHelperDateOptionsFormat,
    IHelperDateOptionsForward,
    IHelperDateOptionsMonth,
} from 'src/common/helper/interfaces/helper.interface';

export interface IHelperDateService {
    calculateAge(dateOfBirth: Date, options?: IHelperDateOptions): number;

    diff(
        dateOne: Date,
        dateTwo: Date,
        options?: IHelperDateOptionsDiff
    ): number;

    check(date: string | Date | number, options?: IHelperDateOptions): boolean;

    checkTimestamp(timestamp: number, options?: IHelperDateOptions): boolean;

    checkTimezone(timezone: string): boolean;

    create(options?: IHelperDateOptionsCreate): Date;

    timestamp(options?: IHelperDateOptionsCreate): number;

    format(date: Date, options?: IHelperDateOptionsFormat): string;

    forwardInMilliseconds(
        milliseconds: number,
        options?: IHelperDateOptionsForward
    ): Date;

    backwardInMilliseconds(
        milliseconds: number,
        options?: IHelperDateOptionsBackward
    ): Date;

    forwardInSeconds(
        seconds: number,
        options?: IHelperDateOptionsForward
    ): Date;

    backwardInSeconds(
        seconds: number,
        options?: IHelperDateOptionsBackward
    ): Date;

    forwardInMinutes(
        minutes: number,
        options?: IHelperDateOptionsForward
    ): Date;

    backwardInMinutes(
        minutes: number,
        options?: IHelperDateOptionsBackward
    ): Date;

    forwardInDays(days: number, options?: IHelperDateOptionsForward): Date;

    backwardInDays(days: number, options?: IHelperDateOptionsBackward): Date;

    forwardInMonths(months: number, options?: IHelperDateOptionsForward): Date;

    backwardInMonths(
        months: number,
        options?: IHelperDateOptionsBackward
    ): Date;

    endOfMonth(month: number, options?: IHelperDateOptionsMonth): Date;

    startOfMonth(month: number, options?: IHelperDateOptionsMonth): Date;

    endOfYear(year: number, options?: IHelperDateOptions): Date;

    startOfYear(year: number, options?: IHelperDateOptions): Date;

    endOfDay(date?: Date, options?: IHelperDateOptions): Date;

    startOfDay(date?: Date, options?: IHelperDateOptions): Date;
}
