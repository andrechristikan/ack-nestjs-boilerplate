import {
    IHelperDateCreateOptions,
    IHelperEmailValidation,
    IHelperPasswordOptions,
} from '@common/helper/interfaces/helper.interface';
import { IHelperService } from '@common/helper/interfaces/helper.service.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compareSync, genSaltSync, hashSync } from 'bcryptjs';
import { AES, SHA256, enc, mode, pad } from 'crypto-js';
import { DateObjectUnits, DateTime, Duration, DurationLikeObject } from 'luxon';
import _ from 'lodash';
import { ENUM_HELPER_DATE_DAY_OF } from '@common/helper/enums/helper.enum';

/**
 * Comprehensive utility service providing helper functions for common operations.
 * Includes array manipulation, encryption, hashing, date operations, string utilities,
 * email validation, and mathematical calculations.
 */
@Injectable()
export class HelperService implements IHelperService {
    private readonly defTz: string;

    constructor(private readonly configService: ConfigService) {
        this.defTz = this.configService.get<string>('app.timezone');
    }

    /**
     * Removes duplicate values from an array.
     * @param array - Array to remove duplicates from
     * @returns Array with unique values only
     */
    arrayUnique<T>(array: T[]): T[] {
        return _.uniq(array);
    }

    /**
     * Shuffles array elements randomly.
     * @param array - Array to shuffle
     * @returns New array with shuffled elements
     */
    arrayShuffle<T>(array: T[]): T[] {
        return _.shuffle(array);
    }

    /**
     * Splits array into smaller chunks of specified size.
     * @param a - Array to chunk
     * @param size - Size of each chunk
     * @returns Array of arrays, each containing up to 'size' elements
     */
    arrayChunk<T>(a: T[], size: number): T[][] {
        return _.chunk<T>(a, size);
    }

    /**
     * Returns intersection of two arrays (common elements).
     * @param a - First array
     * @param b - Second array
     * @returns Array containing elements present in both input arrays
     */
    arrayIntersection<T>(a: T[], b: T[]): T[] {
        return _.intersection(a, b);
    }

    /**
     * Encodes string to Base64 format.
     * @param data - String to encode
     * @returns Base64 encoded string
     */
    base64Encrypt(data: string): string {
        const buff: Buffer = Buffer.from(data, 'utf8');
        return buff.toString('base64');
    }

    /**
     * Decodes Base64 string back to original string.
     * @param data - Base64 encoded string
     * @returns Decoded string
     */
    base64Decrypt(data: string): string {
        const buff: Buffer = Buffer.from(data, 'base64');
        return buff.toString('utf8');
    }

    /**
     * Compares two Base64 encoded strings for equality.
     * @param basicToken1 - First Base64 string
     * @param basicToken2 - Second Base64 string
     * @returns True if strings are identical
     */
    base64Compare(basicToken1: string, basicToken2: string): boolean {
        return basicToken1 === basicToken2;
    }

    /**
     * Encrypts data using AES-256-CBC encryption.
     * @param data - Data to encrypt
     * @param key - Encryption key
     * @param iv - Initialization vector
     * @returns Encrypted string
     */
    aes256Encrypt<T>(data: T, key: string, iv: string): string {
        const cIv = enc.Utf8.parse(iv);
        const cipher = AES.encrypt(JSON.stringify(data), key, {
            mode: mode.CBC,
            padding: pad.Pkcs7,
            iv: cIv,
        });

        return cipher.toString();
    }

    /**
     * Decrypts AES-256-CBC encrypted data.
     * @param encrypted - Encrypted string
     * @param key - Decryption key
     * @param iv - Initialization vector
     * @returns Decrypted data
     */
    aes256Decrypt<T>(encrypted: string, key: string, iv: string): T {
        const cIv = enc.Utf8.parse(iv);
        const cipher = AES.decrypt(encrypted, key, {
            mode: mode.CBC,
            padding: pad.Pkcs7,
            iv: cIv,
        });

        return JSON.parse(cipher.toString(enc.Utf8));
    }

    /**
     * Compares two AES encrypted strings for equality.
     * @param aes1 - First encrypted string
     * @param aes2 - Second encrypted string
     * @returns True if strings are identical
     */
    aes256Compare(aes1: string, aes2: string): boolean {
        return aes1 === aes2;
    }

    /**
     * Generates bcrypt salt for password hashing.
     * @param length - Salt rounds/length
     * @returns Generated salt string
     */
    bcryptGenerateSalt(length: number): string {
        return genSaltSync(length);
    }

    /**
     * Hashes password using bcrypt with provided salt.
     * @param passwordString - Plain text password
     * @param salt - Salt for hashing
     * @returns Hashed password
     */
    bcryptHash(passwordString: string, salt: string): string {
        return hashSync(passwordString, salt);
    }

    /**
     * Compares plain text password with bcrypt hashed password.
     * @param passwordString - Plain text password
     * @param passwordHashed - Hashed password to compare against
     * @returns True if passwords match
     */
    bcryptCompare(passwordString: string, passwordHashed: string): boolean {
        return compareSync(passwordString, passwordHashed);
    }

    /**
     * Creates SHA256 hash of input string.
     * @param string - String to hash
     * @returns SHA256 hash in hexadecimal format
     */
    sha256Hash(string: string): string {
        return SHA256(string).toString(enc.Hex);
    }

    /**
     * Compares two SHA256 hashes for equality.
     * @param hashOne - First hash
     * @param hashTwo - Second hash
     * @returns True if hashes are identical
     */
    sha256Compare(hashOne: string, hashTwo: string): boolean {
        return hashOne === hashTwo;
    }

    /**
     * Validates if string contains only numeric characters.
     * @param number - String to validate
     * @returns True if string is a valid number
     */
    checkNumberString(number: string): boolean {
        const regex = /^-?\d+$/;
        return regex.test(number);
    }

    /**
     * Generates random number with specified digit length.
     * @param length - Number of digits
     * @returns Random number with specified length
     */
    randomNumber(length: number): number {
        const min: number = Number.parseInt(`1`.padEnd(length, '0'));
        const max: number = Number.parseInt(`9`.padEnd(length, '9'));
        return this.randomNumberInRange(min, max);
    }

    /**
     * Generates random number within specified range.
     * @param min - Minimum value (inclusive)
     * @param max - Maximum value (exclusive)
     * @returns Random number within range
     */
    randomNumberInRange(min: number, max: number): number {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min) + min);
    }

    /**
     * Calculates percentage of value relative to total.
     * @param value - Value to calculate percentage for
     * @param total - Total value for percentage calculation
     * @returns Percentage rounded to 2 decimal places
     */
    calculatePercent(value: number, total: number): number {
        let tValue = value / total;
        if (Number.isNaN(tValue) || !Number.isFinite(tValue)) {
            tValue = 0;
        }

        return Number.parseFloat((tValue * 100).toFixed(2));
    }

    /**
     * Generates random alphanumeric string of specified length.
     * @param length - Length of string to generate
     * @returns Random string containing letters and numbers
     */
    randomString(length: number): string {
        let result = '';
        const characters =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        let counter = 0;
        while (counter < length) {
            result += characters.charAt(
                Math.floor(Math.random() * characters.length)
            );

            counter += 1;
        }

        return result;
    }

    /**
     * Censors string by replacing characters with asterisks while preserving some characters.
     * @param text - Text to censor
     * @returns Censored text with asterisks
     */
    censorString(text: string): string {
        if (text.length <= 5) {
            const stringCensor = '*'.repeat(text.length - 1);
            return `${stringCensor}${text.slice(-1)}`;
        } else if (text.length <= 10) {
            const stringCensor = '*'.repeat(text.length - 3);
            return `${stringCensor}${text.slice(-3)}`;
        }

        const stringCensor = '*'.repeat(10);
        return `${text.slice(0, 3)}${stringCensor}${text.slice(-4)}`;
    }

    /**
     * Validates password strength based on complexity requirements.
     * @param password - Password to validate
     * @param options - Password validation options
     * @returns True if password meets strength requirements
     */
    checkPasswordStrength(
        password: string,
        options?: IHelperPasswordOptions
    ): boolean {
        const length = options?.length ?? 8;
        const regex = new RegExp(
            `^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9]).{${length},}$`
        );

        return regex.test(password);
    }

    /**
     * Validates email address format and structure comprehensively.
     * @param value - Email address to validate
     * @returns Validation result with status and error message if invalid
     */
    checkEmail(value: string): IHelperEmailValidation {
        const regex = new RegExp(/\S+@\S+\.\S+/);
        const valid = regex.test(value);
        if (!valid) {
            return {
                validated: false,
                messagePath: 'request.error.email.invalid',
            };
        }

        const atSymbolCount = (value.match(/@/g) || []).length;
        if (atSymbolCount !== 1) {
            return {
                validated: false,
                messagePath: 'request.error.email.multipleAtSymbols',
            };
        }

        const [localPart, domain] = value.split('@');

        if (!domain || domain.length > 63) {
            return {
                validated: false,
                messagePath: 'request.error.email.domainLength',
            };
        } else if (domain.startsWith('-') || domain.endsWith('-')) {
            return {
                validated: false,
                messagePath: 'request.error.email.domainDash',
            };
        } else if (domain.startsWith('.') || domain.endsWith('.')) {
            return {
                validated: false,
                messagePath: 'request.error.email.domainDot',
            };
        } else if (domain.includes('..')) {
            return {
                validated: false,
                messagePath: 'request.error.email.domainConsecutiveDots',
            };
        }

        const domainLabels = domain.split('.');
        if (domainLabels.length < 2) {
            return {
                validated: false,
                messagePath: 'request.error.email.domainFormat',
            };
        }

        for (const label of domainLabels) {
            if (label.length === 0) {
                return {
                    validated: false,
                    messagePath: 'request.error.email.domainEmptyLabel',
                };
            } else if (label.length > 63) {
                return {
                    validated: false,
                    messagePath: 'request.error.email.domainLabelLength',
                };
            } else if (label.startsWith('-') || label.endsWith('-')) {
                return {
                    validated: false,
                    messagePath: 'request.error.email.domainLabelDash',
                };
            }

            const validLabelChars = /^[a-zA-Z0-9-]+$/;
            if (!validLabelChars.test(label)) {
                return {
                    validated: false,
                    messagePath: 'request.error.email.domainInvalidChars',
                };
            }
        }

        const tld = domainLabels[domainLabels.length - 1];
        const validTLD = /^[a-zA-Z]{2,}$/;
        if (!validTLD.test(tld)) {
            return {
                validated: false,
                messagePath: 'request.error.email.invalidTLD',
            };
        }

        if (!localPart || localPart.length === 0) {
            return {
                validated: false,
                messagePath: 'request.error.email.localPartNotEmpty',
            };
        } else if (localPart.length > 64) {
            return {
                validated: false,
                messagePath: 'request.error.email.localPartMaxLength',
            };
        } else if (localPart.startsWith('.') || localPart.endsWith('.')) {
            return {
                validated: false,
                messagePath: 'request.error.email.localPartDot',
            };
        } else if (localPart.includes('..')) {
            return {
                validated: false,
                messagePath: 'request.error.email.consecutiveDots',
            };
        }

        const allowedLocalPartChars = /^[a-zA-Z0-9-_.]+$/;
        if (!allowedLocalPartChars.test(localPart)) {
            return {
                validated: false,
                messagePath: 'request.error.email.invalidChars',
            };
        }

        return {
            validated: true,
        };
    }

    /**
     * Checks if URL matches any of the provided wildcard patterns.
     * @param url - URL to check
     * @param patterns - Array of patterns, may include wildcards (*)
     * @returns True if URL matches any pattern
     */
    checkUrlContainWildcard(url: string, patterns: string[]): boolean {
        if (patterns.includes(url)) {
            return true;
        }

        return patterns.some(pattern => {
            if (pattern.includes('*')) {
                try {
                    const regexPattern = pattern
                        .replace(/\./g, '\\.')
                        .replace(/\*/g, '.*');

                    const regex = new RegExp(`^${regexPattern}$`);
                    return regex.test(url);
                } catch {
                    return false;
                }
            }
            return false;
        });
    }

    /**
     * Calculates age duration from date of birth.
     * @param dateOfBirth - Date of birth
     * @param fromYear - Optional year to calculate age from
     * @returns Duration object representing age
     */
    calculateAge(dateOfBirth: Date, fromYear?: number): Duration {
        const dateTime = DateTime.now()
            .setZone(this.defTz)
            .plus({
                day: 1,
            })
            .set({
                hour: 0,
                minute: 0,
                second: 0,
                millisecond: 0,
            });
        const dateTimeDob = DateTime.fromJSDate(dateOfBirth)
            .setZone(this.defTz)
            .set({
                hour: 0,
                minute: 0,
                second: 0,
                millisecond: 0,
            });

        if (fromYear) {
            dateTime.set({
                year: fromYear,
            });
        }

        return dateTime.diff(dateTimeDob);
    }

    /**
     * Validates if string is a valid ISO date format.
     * @param date - ISO date string to validate
     * @returns True if date string is valid ISO format
     */
    dateCheckIso(date: string): boolean {
        return DateTime.fromISO(date).setZone(this.defTz).isValid;
    }

    /**
     * Validates if timestamp is a valid date timestamp.
     * @param timestamp - Timestamp in milliseconds
     * @returns True if timestamp represents valid date
     */
    dateCheckTimestamp(timestamp: number): boolean {
        return DateTime.fromMillis(timestamp).setZone(this.defTz).isValid;
    }

    /**
     * Gets timezone name for given date.
     * @param date - Date to get timezone for
     * @returns Timezone name string
     */
    dateGetZone(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.defTz).zone.name;
    }

    /**
     * Gets timezone offset for given date.
     * @param date - Date to get timezone offset for
     * @returns Timezone offset string
     */
    dateGetZoneOffset(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.defTz).offsetNameShort;
    }

    /**
     * Converts date to timestamp in milliseconds.
     * @param date - Date to convert
     * @returns Timestamp in milliseconds
     */
    dateGetTimestamp(date: Date): number {
        return DateTime.fromJSDate(date).setZone(this.defTz).toMillis();
    }

    /**
     * Formats date to RFC2822 string format.
     * @param date - Date to format
     * @returns RFC2822 formatted date string
     */
    dateFormatToRFC2822(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.defTz).toRFC2822();
    }

    /**
     * Formats date to ISO string format.
     * @param date - Date to format
     * @returns ISO formatted date string
     */
    dateFormatToIso(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.defTz).toISO();
    }

    /**
     * Formats date to ISO date string (YYYY-MM-DD).
     * @param date - Date to format
     * @returns ISO date string
     */
    dateFormatToIsoDate(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.defTz).toISODate();
    }

    /**
     * Formats date to ISO time string.
     * @param date - Date to format
     * @returns ISO time string
     */
    dateFormatToIsoTime(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.defTz).toISOTime();
    }

    /**
     * Creates new date with optional day positioning (start/end of day).
     * @param date - Optional base date (defaults to current date)
     * @param options - Date creation options
     * @returns Created date
     */
    dateCreate(date?: Date, options?: IHelperDateCreateOptions): Date {
        let mDate = date
            ? DateTime.fromJSDate(date).setZone(this.defTz)
            : DateTime.now().setZone(this.defTz);

        if (
            options?.dayOf &&
            options?.dayOf === ENUM_HELPER_DATE_DAY_OF.START
        ) {
            mDate = mDate.startOf('day');
        } else if (
            options?.dayOf &&
            options?.dayOf === ENUM_HELPER_DATE_DAY_OF.END
        ) {
            mDate = mDate.endOf('day');
        }

        return mDate.toJSDate();
    }

    /**
     * Creates DateTime instance from Date object.
     * @param date - Optional Date object (defaults to current date)
     * @returns DateTime instance
     */
    dateCreateInstance(date?: Date): DateTime {
        return date ? DateTime.fromJSDate(date) : DateTime.now();
    }

    /**
     * Creates date from ISO string with optional day positioning.
     * @param iso - ISO date string
     * @param options - Date creation options
     * @returns Created date
     */
    dateCreateFromIso(iso: string, options?: IHelperDateCreateOptions): Date {
        const date = DateTime.fromISO(iso).setZone(this.defTz);

        if (
            options?.dayOf &&
            options?.dayOf === ENUM_HELPER_DATE_DAY_OF.START
        ) {
            date.startOf('day');
        } else if (
            options?.dayOf &&
            options?.dayOf === ENUM_HELPER_DATE_DAY_OF.END
        ) {
            date.endOf('day');
        }

        return date.toJSDate();
    }

    /**
     * Creates date from timestamp with optional day positioning.
     * @param timestamp - Optional timestamp in milliseconds (defaults to current time)
     * @param options - Date creation options
     * @returns Created date
     */
    dateCreateFromTimestamp(
        timestamp?: number,
        options?: IHelperDateCreateOptions
    ): Date {
        const date = timestamp
            ? DateTime.fromMillis(timestamp).setZone(this.defTz)
            : DateTime.now().setZone(this.defTz);

        if (
            options?.dayOf &&
            options?.dayOf === ENUM_HELPER_DATE_DAY_OF.START
        ) {
            date.startOf('day');
        } else if (
            options?.dayOf &&
            options?.dayOf === ENUM_HELPER_DATE_DAY_OF.END
        ) {
            date.endOf('day');
        }

        return date.toJSDate();
    }

    /**
     * Sets specific date units (year, month, day, etc.) on a date.
     * @param date - Date to modify
     * @param units - Object containing date units to set
     * @returns Modified date
     */
    dateSet(date: Date, units: DateObjectUnits): Date {
        return DateTime.fromJSDate(date)
            .setZone(this.defTz)
            .set(units)
            .toJSDate();
    }

    /**
     * Adds duration to a date (moves date forward).
     * @param date - Base date
     * @param duration - Duration to add
     * @returns New date with added duration
     */
    dateForward(date: Date, duration: Duration): Date {
        return DateTime.fromJSDate(date)
            .setZone(this.defTz)
            .plus(duration)
            .toJSDate();
    }

    /**
     * Subtracts duration from a date (moves date backward).
     * @param date - Base date
     * @param duration - Duration to subtract
     * @returns New date with subtracted duration
     */
    dateBackward(date: Date, duration: Duration): Date {
        return DateTime.fromJSDate(date)
            .setZone(this.defTz)
            .minus(duration)
            .toJSDate();
    }

    /**
     * Creates Duration object from duration-like object.
     * @param duration - Duration configuration object
     * @returns Duration instance
     */
    dateCreateDuration(duration: DurationLikeObject): Duration {
        return Duration.fromObject(duration);
    }
}
