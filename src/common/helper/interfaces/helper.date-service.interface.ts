import {
    IHelperDateExtractDate,
    IHelperDateOptionsBackward,
    IHelperDateOptionsCreate,
    IHelperDateOptionsDiff,
    IHelperDateOptionsFormat,
    IHelperDateOptionsForward,
    IHelperDateOptionsMonth,
} from 'src/common/helper/interfaces/helper.interface';

export interface IHelperDateService {
    calculateAge(dateOfBirth: Date): number;

    diff(
        dateOne: Date,
        dateTwo: Date,
        options?: IHelperDateOptionsDiff
    ): number;

    check(date: string | Date | number): boolean;

    checkTimestamp(timestamp: number): boolean;

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

    forwardInHours(hours: number, options?: IHelperDateOptionsForward): Date;

    backwardInHours(hours: number, options?: IHelperDateOptionsBackward): Date;

    forwardInDays(days: number, options?: IHelperDateOptionsForward): Date;

    backwardInDays(days: number, options?: IHelperDateOptionsBackward): Date;

    forwardInMonths(months: number, options?: IHelperDateOptionsForward): Date;

    backwardInMonths(
        months: number,
        options?: IHelperDateOptionsBackward
    ): Date;

    endOfMonth(month: number, options?: IHelperDateOptionsMonth): Date;

    startOfMonth(month: number, options?: IHelperDateOptionsMonth): Date;

    endOfYear(year: number): Date;

    startOfYear(year: number): Date;

    endOfDay(date?: Date): Date;

    startOfDay(date?: Date): Date;

    extractDate(date: string | Date | number): IHelperDateExtractDate;
}
