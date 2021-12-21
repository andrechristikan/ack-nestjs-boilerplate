import { Injectable } from '@nestjs/common';
import moment from 'moment';
import { ConfigService } from '@nestjs/config';
import { hash, compare, genSalt } from 'bcrypt';
import { isString } from 'class-validator';
import { JwtService } from '@nestjs/jwt';
import {
    createCipheriv,
    createDecipheriv,
    scrypt,
    createHash,
    randomBytes
} from 'crypto';
import { promisify } from 'util';
import { IHelperJwtOptions } from './helper.interface';

@Injectable()
export class HelperService {
    constructor(
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService
    ) {}

    async delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async calculateAge(dateOfBirth: Date): Promise<number> {
        const today: Date = new Date();
        let age: number = today.getFullYear() - dateOfBirth.getFullYear();
        const m = today.getMonth() - dateOfBirth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dateOfBirth.getDate())) {
            age--;
        }
        return age;
    }

    async checkEmail(email: string): Promise<boolean> {
        const regex = /\S+@\S+\.\S+/;
        return regex.test(email);
    }

    async randomReference(prefix?: string): Promise<string> {
        const timestamp: string = `${new Date().valueOf()}`;
        const randomString: string = await this.randomString(10);
        const reference: string = prefix
            ? `${prefix}-${timestamp}${randomString}`
            : `${timestamp}${randomString}`;
        return reference.toUpperCase();
    }

    async randomString(length: number): Promise<string> {
        return randomBytes(length).toString('hex');
    }

    async randomOtpNumber(length: number): Promise<string> {
        const min: number = parseInt(`1`.padEnd(length, '0'));
        const max: number = parseInt(`9`.padEnd(length, '9'));
        return this.randomNumberInRange(min, max);
    }

    async randomNumberInRange(min: number, max: number): Promise<string> {
        return `${Math.floor(Math.random() * (max - min + 1)) + min}`;
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

    async bcryptHashPassword(
        passwordString: string,
        salt: string
    ): Promise<string> {
        return hash(passwordString, salt);
    }

    async randomSalt(): Promise<string> {
        return genSalt(this.configService.get<number>('helper.salt.length'));
    }

    async bcryptComparePassword(
        passwordString: string,
        passwordHashed: string
    ): Promise<boolean> {
        return compare(passwordString, passwordHashed);
    }

    async base64Encrypt(data: string): Promise<string> {
        const buff: Buffer = Buffer.from(data);
        return buff.toString('base64');
    }

    async base64Decrypt(data: string): Promise<string> {
        const buff: Buffer = Buffer.from(data, 'base64');
        return buff.toString('utf8');
    }

    async jwtCreateToken(
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
                )
        });
    }

    async jwtVerify(
        token: string,
        options?: IHelperJwtOptions
    ): Promise<boolean> {
        const payload: Record<string, any> = this.jwtService.verify(token, {
            secret:
                options.secretKey ||
                this.configService.get<string>('helper.jwt.secretKey')
        });

        return payload ? true : false;
    }

    async jwtPayload(
        token: string,
        options?: IHelperJwtOptions
    ): Promise<Record<string, any>> {
        return this.jwtService.verify(token, {
            secret:
                options.secretKey ||
                this.configService.get<string>('helper.jwt.secretKey')
        });
    }

    async aes256BitEncrypt(
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
            cipher.final()
        ]);

        return encryptedText.toString('base64');
    }

    async aes256BitDecrypt(
        encrypted: string,
        key: string,
        iv: string
    ): Promise<string> {
        const data: Buffer = Buffer.from(encrypted, 'base64');
        const crp = (await promisify(scrypt)(key, 'salt', 32)) as Buffer;
        const decipher = createDecipheriv('aes-256-ctr', crp, iv);
        const decryptedText = Buffer.concat([
            decipher.update(data),
            decipher.final()
        ]);

        return decryptedText.toString('utf8');
    }

    async sha256Decrypt(string: string): Promise<string> {
        return createHash('sha256').update(string).digest('hex');
    }
}
