import {
    IHelperDateExtractDate,
    IHelperDateOptionsBackward,
    IHelperDateOptionsCreate,
    IHelperDateOptionsDiff,
    IHelperDateOptionsFormat,
    IHelperDateOptionsForward,
    IHelperDateStartAndEnd,
    IHelperDateStartAndEndDate,
} from 'src/common/helper/interfaces/helper.interface';

export interface IHelperDateService {
    calculateAge(dateOfBirth: Date, year?: number): number;

    diff(
        dateOne: Date,
        dateTwoMoreThanDateOne: Date,
        options?: IHelperDateOptionsDiff
    ): number;

    check(date: string | Date | number): boolean;

    checkTimestamp(timestamp: number): boolean;

    create(
        date?: string | Date | number,
        options?: IHelperDateOptionsCreate
    ): Date;

    timestamp(
        date?: string | Date | number,
        options?: IHelperDateOptionsCreate
    ): number;

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

    endOfMonth(date?: Date): Date;

    startOfMonth(date?: Date): Date;

    endOfYear(date?: Date): Date;

    startOfYear(date?: Date): Date;

    endOfDay(date?: Date): Date;

    startOfDay(date?: Date): Date;

    extractDate(date: string | Date | number): IHelperDateExtractDate;

    getStartAndEndDate(
        options?: IHelperDateStartAndEnd
    ): IHelperDateStartAndEndDate;
}
