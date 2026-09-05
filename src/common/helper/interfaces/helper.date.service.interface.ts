import { IHelperDateCreateOptions } from '@common/helper/interfaces/helper.interface';
import { DateObjectUnits, DateTime, Duration, DurationLikeObject } from 'luxon';

export interface IHelperDateService {
    calculateAge(dateOfBirth: Date, fromYear?: number): Duration;
    checkIso(date: string): boolean;
    checkTimestamp(timestamp: number): boolean;
    getZone(date: Date): string;
    getZoneOffset(date: Date): string;
    getTimestamp(date: Date): number;
    formatToRFC2822(date: Date): string;
    formatToIso(date: Date): string;
    formatToIsoDate(date: Date): string;
    formatToIsoTime(date: Date): string;
    create(date?: Date, options?: IHelperDateCreateOptions): Date;
    createInstance(date?: Date): DateTime;
    createFromIso(iso: string, options?: IHelperDateCreateOptions): Date;
    createFromTimestamp(
        timestamp?: number,
        options?: IHelperDateCreateOptions
    ): Date;
    set(date: Date, units: DateObjectUnits): Date;
    forward(date: Date, duration: Duration): Date;
    backward(date: Date, duration: Duration): Date;
    createDuration(duration: DurationLikeObject): Duration;
    diff(dateOne: Date, dateTwo: Date): Duration;
}
