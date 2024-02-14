import {
    IHelperDateBackwardOptions,
    IHelperDateCreateOptions,
    IHelperDateDiffOptions,
    IHelperDateFormatOptions,
    IHelperDateForwardOptions,
    IHelperDateRoundDownOptions,
    IHelperDateSetTimeOptions,
} from 'src/common/helper/interfaces/helper.interface';

export interface IHelperDateService {
    calculateAge(dateOfBirth: Date, year?: number): number;
    diff(
        dateOne: Date,
        dateTwoMoreThanDateOne: Date,
        options?: IHelperDateDiffOptions
    ): number;
    check(date: string | Date | number): boolean;
    checkIso(date: string | Date | number): boolean;
    checkTimestamp(timestamp: number): boolean;
    create(
        date?: string | number | Date,
        options?: IHelperDateCreateOptions
    ): Date;
    createTimestamp(
        date?: string | number | Date,
        options?: IHelperDateCreateOptions
    ): number;
    format(date: Date, options?: IHelperDateFormatOptions): string;
    formatIsoDurationFromMinutes(minutes: number): string;
    formatIsoDurationFromHours(hours: number): string;
    formatIsoDurationFromDays(days: number): string;
    forwardInSeconds(
        seconds: number,
        options?: IHelperDateForwardOptions
    ): Date;
    backwardInSeconds(
        seconds: number,
        options?: IHelperDateBackwardOptions
    ): Date;
    forwardInMinutes(
        minutes: number,
        options?: IHelperDateForwardOptions
    ): Date;
    backwardInMinutes(
        minutes: number,
        options?: IHelperDateBackwardOptions
    ): Date;
    forwardInHours(hours: number, options?: IHelperDateForwardOptions): Date;
    backwardInHours(hours: number, options?: IHelperDateBackwardOptions): Date;
    forwardInDays(days: number, options?: IHelperDateForwardOptions): Date;
    backwardInDays(days: number, options?: IHelperDateBackwardOptions): Date;
    forwardInMonths(months: number, options?: IHelperDateForwardOptions): Date;
    backwardInMonths(
        months: number,
        options?: IHelperDateBackwardOptions
    ): Date;
    forwardInYears(years: number, options?: IHelperDateForwardOptions): Date;
    backwardInYears(years: number, options?: IHelperDateBackwardOptions): Date;
    endOfMonth(date?: Date): Date;
    startOfMonth(date?: Date): Date;
    endOfYear(date?: Date): Date;
    startOfYear(date?: Date): Date;
    endOfDay(date?: Date): Date;
    startOfDay(date?: Date): Date;
    setTime(
        date: Date,
        { hour, minute, second, millisecond }: IHelperDateSetTimeOptions
    ): Date;
    addTime(
        date: Date,
        { hour, minute, second, millisecond }: IHelperDateSetTimeOptions
    ): Date;
    subtractTime(
        date: Date,
        { hour, minute, second }: IHelperDateSetTimeOptions
    ): Date;
    roundDown(date: Date, options?: IHelperDateRoundDownOptions): Date;
}
