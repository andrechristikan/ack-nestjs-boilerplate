import { Injectable } from '@nestjs/common';
import moment from 'moment';
import { ConfigService } from '@nestjs/config';
import { hash, compare, genSalt } from 'bcrypt';
import { isString } from 'class-validator';
import { JwtService } from '@nestjs/jwt';
import { createCipheriv, createDecipheriv, scrypt, createHash } from 'crypto';
import { promisify } from 'util';
import { IHelperJwtOptions } from './helper.interface';
import faker from '@faker-js/faker';

@Injectable()
export class HelperService {
    constructor(
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService
    ) {}

    // time
    async timeDelay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // array
    async arrayShuffle(array: Array<any>) {
        return array
            .map((value) => ({ value, sort: Math.random() }))
            .sort((a, b) => a.sort - b.sort)
            .map(({ value }) => value);
    }

    async arrayEquals(a: string[], b: string[]) {
        a = a.sort();
        b = b.sort();
        return (
            Array.isArray(a) &&
            Array.isArray(b) &&
            a.length === b.length &&
            a.every((val, index) => val === b[index])
        );
    }

    async arrayIn(a: string[], b: string[]) {
        return a.some((val) => b.includes(val));
    }

    // string
    async stringCheckEmail(email: string): Promise<boolean> {
        const regex = /\S+@\S+\.\S+/;
        return regex.test(email);
    }

    async stringRandomReference(
        length: number,
        prefix?: string
    ): Promise<string> {
        const timestamp = `${new Date().valueOf()}`;
        const randomString: string = await this.stringRandom(length, {
            safe: true,
            upperCase: true,
        });

        return prefix
            ? `${prefix}-${timestamp}${randomString}`
            : `${timestamp}${randomString}`;
    }

    async stringRandom(
        length: number,
        options?: Record<string, any>
    ): Promise<string> {
        return options && options.safe
            ? faker.random.alpha({
                  count: length,
                  upcase: options && options.upperCase ? true : false,
              })
            : options && options.upperCase
            ? faker.random.alphaNumeric(length).toUpperCase()
            : faker.random.alphaNumeric(length);
    }

    // number
    async numberCheck(number: string): Promise<boolean> {
        const regex = /^-?\d+$/;
        return regex.test(number);
    }

    async numberCalculateAge(dateOfBirth: Date): Promise<number> {
        return moment().diff(dateOfBirth, 'years');
    }

    async numberRandom(length: number): Promise<number> {
        const min: number = parseInt(`1`.padEnd(length, '0'));
        const max: number = parseInt(`9`.padEnd(length, '9'));
        return this.numberRandomInRange(min, max);
    }

    async numberRandomInRange(min: number, max: number): Promise<number> {
        return faker.datatype.number({ min, max });
    }

    // Encryption
    async encryptionBase64Encrypt(data: string): Promise<string> {
        const buff: Buffer = Buffer.from(data);
        return buff.toString('base64');
    }

    async encryptionBase64Decrypt(data: string): Promise<string> {
        const buff: Buffer = Buffer.from(data, 'base64');
        return buff.toString('utf8');
    }

    async encryptionAES256Encrypt(
        data: string | Record<string, any> | Record<string, any>[],
        key: string,
        iv: string
    ): Promise<string> {
        let dataParse: string = data as string;
        if (!isString(data)) {
            dataParse = JSON.stringify(data);
        }

        const crp = (await promisify(scrypt)(key, 'salt', 32)) as Buffer;
        const cipher = createCipheriv('aes-256-ctr', crp, iv);

        const encryptedText = Buffer.concat([
            cipher.update(dataParse),
            cipher.final(),
        ]);

        return encryptedText.toString('base64');
    }

    async encryptionAES256Decrypt(
        encrypted: string,
        key: string,
        iv: string
    ): Promise<string> {
        const data: Buffer = Buffer.from(encrypted, 'base64');
        const crp = (await promisify(scrypt)(key, 'salt', 32)) as Buffer;
        const decipher = createDecipheriv('aes-256-ctr', crp, iv);
        const decryptedText = Buffer.concat([
            decipher.update(data),
            decipher.final(),
        ]);

        return decryptedText.toString('utf8');
    }

    async encryptionJWTEncrypt(
        payload: Record<string, any>,
        options?: IHelperJwtOptions
    ): Promise<string> {
        return this.jwtService.sign(payload, {
            secret:
                options.secretKey ||
                this.configService.get<string>('helper.jwt.secretKey'),
            expiresIn:
                options.expiredIn ||
                this.configService.get<string>('helper.jwt.expirationTime'),
            notBefore:
                options.notBefore ||
                this.configService.get<string>(
                    'helper.jwt.notBeforeExpirationTime'
                ),
        });
    }

    async encryptionJWTDecrypt(
        token: string,
        options?: IHelperJwtOptions
    ): Promise<Record<string, any>> {
        return this.jwtService.verify(token, {
            secret:
                options.secretKey ||
                this.configService.get<string>('helper.jwt.secretKey'),
        });
    }

    async encryptionJwtVerify(
        token: string,
        options?: IHelperJwtOptions
    ): Promise<boolean> {
        const payload: Record<string, any> = this.jwtService.verify(token, {
            secret:
                options.secretKey ||
                this.configService.get<string>('helper.jwt.secretKey'),
        });

        return payload ? true : false;
    }

    // Hashing
    async hashingRandomSalt(length?: number): Promise<string> {
        return genSalt(
            length || this.configService.get<number>('helper.salt.length')
        );
    }

    async hashingBcrypt(passwordString: string, salt: string): Promise<string> {
        return hash(passwordString, salt);
    }

    async hashingBcryptCompare(
        passwordString: string,
        passwordHashed: string
    ): Promise<boolean> {
        return compare(passwordString, passwordHashed);
    }

    async hashingSHA256(string: string): Promise<string> {
        return createHash('sha256').update(string).digest('hex');
    }

    async hashingSHA256Compare(string: string, hash: string): Promise<boolean> {
        const stringHash: string = createHash('sha256')
            .update(string)
            .digest('hex');
        return stringHash === hash;
    }

    // date
    async dateDiff(
        dateOne: Date,
        dateTwo: Date,
        options?: string
    ): Promise<number> {
        const mDateOne = moment(dateOne);
        const mDateTwo = moment(dateTwo);
        const diff = moment.duration(mDateTwo.diff(mDateOne));

        if (options === 'milis') {
            return diff.asMilliseconds();
        } else if (options === 'seconds') {
            return diff.asSeconds();
        } else if (options === 'hours') {
            return diff.asHours();
        } else if (options === 'days') {
            return diff.asDays();
        } else {
            return diff.asMinutes();
        }
    }

    async dateCheck(date: string): Promise<boolean> {
        return moment(date, true).isValid();
    }

    async dateCreate(date?: string | Date): Promise<Date> {
        return moment(date, true).toDate();
    }

    async dateTimestamp(date?: string | Date): Promise<number> {
        return moment(date, true).valueOf();
    }

    async dateTimeToString(date: Date, format?: string): Promise<string> {
        return moment(date).format(format || 'YYYY-MM-DD');
    }

    async dateTimeForwardInMinutes(minutes: number): Promise<Date> {
        return moment().add(minutes, 'm').toDate();
    }

    async dateTimeBackwardInMinutes(minutes: number): Promise<Date> {
        return moment().subtract(minutes, 'm').toDate();
    }

    async dateTimeForwardInDays(days: number): Promise<Date> {
        return moment().add(days, 'd').toDate();
    }

    async dateTimeBackwardInDays(days: number): Promise<Date> {
        return moment().subtract(days, 'd').toDate();
    }

    async dateTimeForwardInMonths(months: number): Promise<Date> {
        return moment().add(months, 'M').toDate();
    }

    async dateTimeBackwardInMonths(months: number): Promise<Date> {
        return moment().subtract(months, 'M').toDate();
    }
}
