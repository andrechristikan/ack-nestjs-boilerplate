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

@Injectable()
export class HelperService implements IHelperService {
    private readonly defTz: string;

    constructor(private readonly configService: ConfigService) {
        this.defTz = this.configService.get<string>('app.timezone');
    }
    arrayUnique<T>(array: T[]): T[] {
        return _.uniq(array);
    }

    arrayShuffle<T>(array: T[]): T[] {
        return _.shuffle(array);
    }

    arrayChunk<T>(a: T[], size: number): T[][] {
        return _.chunk<T>(a, size);
    }

    arrayIntersection<T>(a: T[], b: T[]): T[] {
        return _.intersection(a, b);
    }

    base64Encrypt(data: string): string {
        const buff: Buffer = Buffer.from(data, 'utf8');
        return buff.toString('base64');
    }

    base64Decrypt(data: string): string {
        const buff: Buffer = Buffer.from(data, 'base64');
        return buff.toString('utf8');
    }

    base64Compare(basicToken1: string, basicToken2: string): boolean {
        return basicToken1 === basicToken2;
    }

    aes256Encrypt<T>(data: T, key: string, iv: string): string {
        const cIv = enc.Utf8.parse(iv);
        const cipher = AES.encrypt(JSON.stringify(data), key, {
            mode: mode.CBC,
            padding: pad.Pkcs7,
            iv: cIv,
        });

        return cipher.toString();
    }

    aes256Decrypt<T>(encrypted: string, key: string, iv: string): T {
        const cIv = enc.Utf8.parse(iv);
        const cipher = AES.decrypt(encrypted, key, {
            mode: mode.CBC,
            padding: pad.Pkcs7,
            iv: cIv,
        });

        return JSON.parse(cipher.toString(enc.Utf8));
    }

    aes256Compare(aes1: string, aes2: string): boolean {
        return aes1 === aes2;
    }

    bcryptGenerateSalt(length: number): string {
        return genSaltSync(length);
    }

    bcryptHash(passwordString: string, salt: string): string {
        return hashSync(passwordString, salt);
    }

    bcryptCompare(passwordString: string, passwordHashed: string): boolean {
        return compareSync(passwordString, passwordHashed);
    }

    sha256Hash(string: string): string {
        return SHA256(string).toString(enc.Hex);
    }

    sha256Compare(hashOne: string, hashTwo: string): boolean {
        return hashOne === hashTwo;
    }

    checkNumberString(number: string): boolean {
        const regex = /^-?\d+$/;
        return regex.test(number);
    }

    randomNumber(length: number): number {
        const min: number = Number.parseInt(`1`.padEnd(length, '0'));
        const max: number = Number.parseInt(`9`.padEnd(length, '9'));
        return this.randomNumberInRange(min, max);
    }

    randomNumberInRange(min: number, max: number): number {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min) + min);
    }

    calculatePercent(value: number, total: number): number {
        let tValue = value / total;
        if (Number.isNaN(tValue) || !Number.isFinite(tValue)) {
            tValue = 0;
        }

        return Number.parseFloat((tValue * 100).toFixed(2));
    }

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

    checkEmail(value: string): IHelperEmailValidation {
        const regex = new RegExp(/\S+@\S+\.\S+/);
        const valid = regex.test(value);
        if (!valid) {
            return {
                validated: false,
                messagePath: 'request.email.invalid',
            };
        }

        const atSymbolCount = (value.match(/@/g) || []).length;
        if (atSymbolCount !== 1) {
            return {
                validated: false,
                messagePath: 'request.email.multipleAtSymbols',
            };
        }

        const [localPart, domain] = value.split('@');

        // validate domain part
        if (!domain || domain.length > 63) {
            return {
                validated: false,
                messagePath: 'request.email.domainLength',
            };
        } else if (domain.startsWith('-') || domain.endsWith('-')) {
            return {
                validated: false,
                messagePath: 'request.email.domainDash',
            };
        } else if (domain.startsWith('.') || domain.endsWith('.')) {
            return {
                validated: false,
                messagePath: 'request.email.domainDot',
            };
        } else if (domain.includes('..')) {
            return {
                validated: false,
                messagePath: 'request.email.domainConsecutiveDots',
            };
        }

        const domainLabels = domain.split('.');
        if (domainLabels.length < 2) {
            return {
                validated: false,
                messagePath: 'request.email.domainFormat',
            };
        }

        for (const label of domainLabels) {
            if (label.length === 0) {
                return {
                    validated: false,
                    messagePath: 'request.email.domainEmptyLabel',
                };
            } else if (label.length > 63) {
                return {
                    validated: false,
                    messagePath: 'request.email.domainLabelLength',
                };
            } else if (label.startsWith('-') || label.endsWith('-')) {
                return {
                    validated: false,
                    messagePath: 'request.email.domainLabelDash',
                };
            }

            const validLabelChars = /^[a-zA-Z0-9-]+$/;
            if (!validLabelChars.test(label)) {
                return {
                    validated: false,
                    messagePath: 'request.email.domainInvalidChars',
                };
            }
        }

        const tld = domainLabels[domainLabels.length - 1];
        const validTLD = /^[a-zA-Z]{2,}$/;
        if (!validTLD.test(tld)) {
            return {
                validated: false,
                messagePath: 'request.email.invalidTLD',
            };
        }

        // validate local part
        if (!localPart || localPart.length === 0) {
            return {
                validated: false,
                messagePath: 'request.email.localPartNotEmpty',
            };
        } else if (localPart.length > 64) {
            return {
                validated: false,
                messagePath: 'request.email.localPartMaxLength',
            };
        } else if (localPart.startsWith('.') || localPart.endsWith('.')) {
            return {
                validated: false,
                messagePath: 'request.email.localPartDot',
            };
        } else if (localPart.includes('..')) {
            return {
                validated: false,
                messagePath: 'request.email.consecutiveDots',
            };
        }

        const allowedLocalPartChars = /^[a-zA-Z0-9-_.]+$/;
        if (!allowedLocalPartChars.test(localPart)) {
            return {
                validated: false,
                messagePath: 'request.email.invalidChars',
            };
        }

        return {
            validated: true,
        };
    }

    checkUrlContainWildcard(url: string, patterns: string[]): boolean {
        if (patterns.includes(url)) {
            return true;
        }

        return patterns.some(pattern => {
            if (pattern.includes('*')) {
                try {
                    // Convert wildcard pattern to regex pattern
                    const regexPattern = pattern
                        .replace(/\./g, '\\.') // Escape dots
                        .replace(/\*/g, '.*'); // Replace * with .*

                    // Create regex and test URL
                    const regex = new RegExp(`^${regexPattern}$`);
                    return regex.test(url);
                } catch {
                    return false;
                }
            }
            return false;
        });
    }

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

    dateCheckIso(date: string): boolean {
        return DateTime.fromISO(date).setZone(this.defTz).isValid;
    }

    dateCheckTimestamp(timestamp: number): boolean {
        return DateTime.fromMillis(timestamp).setZone(this.defTz).isValid;
    }

    dateGetZone(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.defTz).zone.name;
    }

    dateGetZoneOffset(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.defTz).offsetNameShort;
    }

    dateGetTimestamp(date: Date): number {
        return DateTime.fromJSDate(date).setZone(this.defTz).toMillis();
    }

    dateFormatToRFC2822(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.defTz).toRFC2822();
    }

    dateFormatToIso(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.defTz).toISO();
    }

    dateFormatToIsoDate(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.defTz).toISODate();
    }

    dateFormatToIsoTime(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.defTz).toISOTime();
    }

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

    dateCreateInstance(date?: Date): DateTime {
        return date ? DateTime.fromJSDate(date) : DateTime.now();
    }

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

    dateSet(date: Date, units: DateObjectUnits): Date {
        return DateTime.fromJSDate(date)
            .setZone(this.defTz)
            .set(units)
            .toJSDate();
    }

    dateForward(date: Date, duration: Duration): Date {
        return DateTime.fromJSDate(date)
            .setZone(this.defTz)
            .plus(duration)
            .toJSDate();
    }

    dateBackward(date: Date, duration: Duration): Date {
        return DateTime.fromJSDate(date)
            .setZone(this.defTz)
            .minus(duration)
            .toJSDate();
    }

    dateCreateDuration(duration: DurationLikeObject): Duration {
        return Duration.fromObject(duration);
    }
}
