import {
    IHelperDateCreateOptions,
    IHelperEmailValidation,
    IHelperPasswordOptions,
} from '@common/helper/interfaces/helper.interface';
import { DateObjectUnits, DateTime, Duration, DurationLikeObject } from 'luxon';

export interface IHelperService {
    arrayUnique<T>(array: T[]): T[];
    arrayShuffle<T>(array: T[]): T[];
    arrayChunk<T>(a: T[], size: number): T[][];
    base64Encrypt(data: string): string;
    base64Decrypt(data: string): string;
    base64Compare(basicToken1: string, basicToken2: string): boolean;
    aes256Encrypt<T>(data: T, key: string, iv: string): string;
    aes256Decrypt<T>(encrypted: string, key: string, iv: string): T;
    aes256Compare(aes1: string, aes2: string): boolean;
    bcryptGenerateSalt(length: number): string;
    bcryptHash(passwordString: string, salt: string): string;
    bcryptCompare(passwordString: string, passwordHashed: string): boolean;
    sha256Hash(string: string): string;
    sha256Compare(hashOne: string, hashTwo: string): boolean;
    checkNumberString(number: string): boolean;
    randomDigits(length: number): string;
    randomNumberInRange(min: number, max: number): number;
    calculatePercent(value: number, total: number): number;
    randomString(length: number): string;
    censorString(text: string): string;
    checkPasswordStrength(
        password: string,
        options?: IHelperPasswordOptions
    ): boolean;
    checkEmail(value: string): IHelperEmailValidation;
    checkUrlContainWildcard(url: string, patterns: string[]): boolean;
    calculateAge(dateOfBirth: Date, fromYear?: number): Duration;
    dateCheckIso(date: string): boolean;
    dateCheckTimestamp(timestamp: number): boolean;
    dateGetZone(date: Date): string;
    dateGetZoneOffset(date: Date): string;
    dateGetTimestamp(date: Date): number;
    dateFormatToRFC2822(date: Date): string;
    dateFormatToIso(date: Date): string;
    dateFormatToIsoDate(date: Date): string;
    dateFormatToIsoTime(date: Date): string;
    dateCreate(date?: Date, options?: IHelperDateCreateOptions): Date;
    dateCreateInstance(date?: Date): DateTime;
    dateCreateFromIso(iso: string, options?: IHelperDateCreateOptions): Date;
    dateCreateFromTimestamp(
        timestamp?: number,
        options?: IHelperDateCreateOptions
    ): Date;
    dateSet(date: Date, units: DateObjectUnits): Date;
    dateForward(date: Date, duration: Duration): Date;
    dateBackward(date: Date, duration: Duration): Date;
    dateCreateDuration(duration: DurationLikeObject): Duration;
}
