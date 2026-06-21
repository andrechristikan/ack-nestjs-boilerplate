import {
    IHelperDateCreateOptions,
    IHelperEmailValidation,
    IHelperPasswordOptions,
} from '@common/helper/interfaces/helper.interface';
import { IHelperService } from '@common/helper/interfaces/helper.service.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compareSync, genSaltSync, hashSync } from 'bcryptjs';
import { AES, MD5, SHA256, enc, lib, mode, pad } from 'crypto-js';
import { DateObjectUnits, DateTime, Duration, DurationLikeObject } from 'luxon';
import _ from 'lodash';
import { EnumHelperDateDayOf } from '@common/helper/enums/helper.enum';
import { hostname } from 'os';
import { GeoLocation, UserAgent } from '@generated/prisma-client';

@Injectable()
export class HelperService implements IHelperService {
    private readonly defTz: string;
    private readonly encryptionSecretKey: string;

    constructor(private readonly configService: ConfigService) {
        this.defTz = this.configService.get<string>('app.timezone')!;
        this.encryptionSecretKey = this.configService.get<string>(
            'app.encryptionSecretKey'
        )!;
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

    private parseAesIv(iv: string): lib.WordArray {
        if (!iv) {
            throw new Error('AES IV parsing failed: missing IV value');
        } else if (iv.startsWith('hex:')) {
            const stringIv = iv.slice(4);
            if (!stringIv) {
                throw new Error('AES IV parsing failed: missing IV value');
            }

            return enc.Hex.parse(stringIv);
        } else if (iv.startsWith('b64:')) {
            const stringIv = iv.slice(4);
            if (!stringIv) {
                throw new Error('AES IV parsing failed: missing IV value');
            }

            return enc.Base64.parse(stringIv);
        }

        return enc.Utf8.parse(iv);
    }

    aes256Encrypt<T>(data: T, key: string, iv: string): string {
        const cIv = this.parseAesIv(iv);
        const cKey = SHA256(key);
        const cipher = AES.encrypt(JSON.stringify(data), cKey, {
            mode: mode.CBC,
            padding: pad.Pkcs7,
            iv: cIv,
        });

        return cipher.toString();
    }

    aes256EncryptSimple(data: string, extendEncryptionKey?: string): string {
        const randomIv = this.randomString(16);
        const encryptionKey = extendEncryptionKey
            ? `${this.encryptionSecretKey}:${extendEncryptionKey}`
            : this.encryptionSecretKey;
        const encrypted = this.aes256Encrypt(data, encryptionKey, randomIv);

        return `${randomIv}:${encrypted}`;
    }

    aes256Decrypt<T>(encrypted: string, key: string, iv: string): T {
        const cIv = this.parseAesIv(iv);
        const cKey = SHA256(key);

        const decrypted = AES.decrypt(encrypted, cKey, {
            mode: mode.CBC,
            padding: pad.Pkcs7,
            iv: cIv,
        }).toString(enc.Utf8);

        if (!decrypted) {
            throw new Error('AES-256-CBC decryption failed');
        }

        return JSON.parse(decrypted);
    }

    aes256DecryptSimple(
        encryptedData: string,
        extendEncryptionKey?: string
    ): string {
        const [iv, encrypted] = encryptedData.split(':');
        if (!iv || !encrypted) {
            throw new Error('Invalid encrypted data format');
        }

        const encryptionKey = extendEncryptionKey
            ? `${this.encryptionSecretKey}:${extendEncryptionKey}`
            : this.encryptionSecretKey;
        return this.aes256Decrypt(encrypted, encryptionKey, iv);
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

    md5Hash(string: string): string {
        return MD5(string).toString(enc.Hex);
    }

    md5Compare(hashOne: string, hashTwo: string): boolean {
        return hashOne === hashTwo;
    }

    checkNumberString(number: string): boolean {
        const regex = /^-?\d+$/;
        return regex.test(number);
    }

    randomDigits(length: number): string {
        const min: number = Number.parseInt(`1`.padEnd(length, '0'));
        const max: number = Number.parseInt(`9`.padEnd(length, '9'));
        return this.randomNumberInRange(min, max).toString();
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

        for (let i = 0; i < length; i++) {
            result += characters[Math.floor(Math.random() * characters.length)];
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
                messagePath: 'request.error.email.invalid',
            };
        }

        const atSymbolCount = (value.match(/@/g) ?? []).length;
        if (atSymbolCount !== 1) {
            return {
                validated: false,
                messagePath: 'request.error.email.multipleAtSymbols',
            };
        }

        const [localPart, domain] = value.split('@');

        if (!domain || domain.length > 253) {
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

    checkUrlMatchesPatterns(url: string, patterns: string[]): boolean {
        if (!url || !patterns?.length) {
            return false;
        }

        let pathname: string;
        try {
            const urlObj = new URL(url);
            pathname = urlObj.pathname;
        } catch {
            pathname = url.split('?')[0].split('#')[0];
        }

        const normalizedPath = pathname.toLowerCase();

        return patterns.some(pattern => {
            if (!pattern) {
                return false;
            }

            const normalizedPattern = pattern.toLowerCase();

            if (normalizedPath === normalizedPattern) {
                return true;
            }

            if (!pattern.includes('*')) {
                return false;
            }

            try {
                if (normalizedPattern === '*') {
                    return true;
                }

                if (normalizedPattern.endsWith('*')) {
                    const basePattern = normalizedPattern.slice(0, -1);

                    if (!basePattern) {
                        return true;
                    }

                    if (basePattern.endsWith('/')) {
                        return normalizedPath.startsWith(basePattern);
                    }

                    return (
                        normalizedPath === basePattern ||
                        normalizedPath.startsWith(basePattern + '/')
                    );
                }

                const regexPattern = normalizedPattern
                    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
                    .replace(/\*/g, '.*');

                const regex = new RegExp(`^${regexPattern}$`);
                return regex.test(normalizedPath);
            } catch {
                return false;
            }
        });
    }

    calculateAge(dateOfBirth: Date, fromYear?: number): Duration {
        let dateTime = DateTime.now()
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
            dateTime = dateTime.set({ year: fromYear });
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
        return DateTime.fromJSDate(date).setZone(this.defTz).offsetNameShort ?? 'UTC';
    }

    dateGetTimestamp(date: Date): number {
        return DateTime.fromJSDate(date).setZone(this.defTz).toMillis();
    }

    dateFormatToRFC2822(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.defTz).toRFC2822()!;
    }

    dateFormatToIso(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.defTz).toISO()!;
    }

    dateFormatToIsoDate(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.defTz).toISODate()!;
    }

    dateFormatToIsoTime(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.defTz).toISOTime()!;
    }

    dateCreate(date?: Date, options?: IHelperDateCreateOptions): Date {
        let mDate = date
            ? DateTime.fromJSDate(date).setZone(this.defTz)
            : DateTime.now().setZone(this.defTz);

        if (options?.dayOf && options?.dayOf === EnumHelperDateDayOf.start) {
            mDate = mDate.startOf('day');
        } else if (
            options?.dayOf &&
            options?.dayOf === EnumHelperDateDayOf.end
        ) {
            mDate = mDate.endOf('day');
        }

        return mDate.toJSDate();
    }

    dateCreateInstance(date?: Date): DateTime {
        return date ? DateTime.fromJSDate(date) : DateTime.now();
    }

    dateCreateFromIso(iso: string, options?: IHelperDateCreateOptions): Date {
        let date = DateTime.fromISO(iso).setZone(this.defTz);

        if (options?.dayOf && options?.dayOf === EnumHelperDateDayOf.start) {
            date = date.startOf('day');
        } else if (
            options?.dayOf &&
            options?.dayOf === EnumHelperDateDayOf.end
        ) {
            date = date.endOf('day');
        }

        return date.toJSDate();
    }

    dateCreateFromTimestamp(
        timestamp?: number,
        options?: IHelperDateCreateOptions
    ): Date {
        let date = timestamp
            ? DateTime.fromMillis(timestamp).setZone(this.defTz)
            : DateTime.now().setZone(this.defTz);

        if (options?.dayOf && options?.dayOf === EnumHelperDateDayOf.start) {
            date = date.startOf('day');
        } else if (
            options?.dayOf &&
            options?.dayOf === EnumHelperDateDayOf.end
        ) {
            date = date.endOf('day');
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

    dateDiff(dateOne: Date, dateTwo: Date): Duration {
        const dOne = DateTime.fromJSDate(dateOne).setZone(this.defTz);
        const dTwo = DateTime.fromJSDate(dateTwo).setZone(this.defTz);

        return dOne.diff(dTwo);
    }

    getHostname(): string {
        return hostname();
    }

    resolveCity(geoLocation?: GeoLocation): string {
        return geoLocation?.city ?? 'Unknown Location';
    }

    resolveDevice(userAgent: UserAgent): string {
        const { device, os, browser } = userAgent;

        if (device?.vendor && device?.model) {
            return `${device.vendor} ${device.model}`;
        }

        if (os?.name) {
            return os.name;
        }

        if (browser?.name) {
            return browser.name;
        }

        return 'Unknown Device';
    }
}
