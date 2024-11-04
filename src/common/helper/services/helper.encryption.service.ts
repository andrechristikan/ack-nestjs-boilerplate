import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AES, enc, mode, pad } from 'crypto-js';
import { IHelperEncryptionService } from 'src/common/helper/interfaces/helper.encryption-service.interface';
import {
    IHelperJwtOptions,
    IHelperJwtVerifyOptions,
} from 'src/common/helper/interfaces/helper.interface';

@Injectable()
export class HelperEncryptionService implements IHelperEncryptionService {
    private readonly logger = new Logger(HelperEncryptionService.name);

    constructor(private readonly jwtService: JwtService) {}

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

    aes256Encrypt<T = Record<string, any>>(
        data: T,
        key: string,
        iv: string
    ): string {
        const cIv = enc.Utf8.parse(iv);
        const cipher = AES.encrypt(JSON.stringify(data), key, {
            mode: mode.CBC,
            padding: pad.Pkcs7,
            iv: cIv,
        });

        return cipher.toString();
    }

    aes256Decrypt<T = Record<string, any>>(
        encrypted: string,
        key: string,
        iv: string
    ): T {
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

    jwtEncrypt(
        payload: Record<string, any>,
        options: IHelperJwtOptions
    ): string {
        return this.jwtService.sign(payload, {
            secret: options.secretKey,
            expiresIn: options.expiredIn,
            notBefore: options.notBefore ?? 0,
            audience: options.audience,
            issuer: options.issuer,
            subject: options.subject,
        });
    }

    jwtDecrypt<T>(token: string): T {
        return this.jwtService.decode<T>(token);
    }

    jwtVerify(token: string, options: IHelperJwtVerifyOptions): boolean {
        try {
            this.jwtService.verify(token, {
                secret: options.secretKey,
                audience: options.audience,
                issuer: options.issuer,
                subject: options.subject,
                ignoreExpiration: options.ignoreExpiration ?? false,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(err);

            return false;
        }
    }
}
