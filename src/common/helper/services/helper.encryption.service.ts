import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AES, enc, mode, pad } from 'crypto-js';
import { IHelperEncryptionService } from 'src/common/helper/interfaces/helper.encryption-service.interface';
import {
    IHelperJwtOptions,
    IHelperJwtVerifyOptions,
} from 'src/common/helper/interfaces/helper.interface';

@Injectable()
export class HelperEncryptionService implements IHelperEncryptionService {
    constructor(private readonly jwtService: JwtService) {}

    base64Encrypt(data: string): string {
        const buff: Buffer = Buffer.from(data, 'utf8');
        return buff.toString('base64');
    }

    base64Decrypt(data: string): string {
        const buff: Buffer = Buffer.from(data, 'base64');
        return buff.toString('utf8');
    }

    base64Compare(clientBasicToken: string, ourBasicToken: string): boolean {
        return ourBasicToken === clientBasicToken;
    }

    aes256Encrypt(
        data: string | Record<string, any> | Record<string, any>[],
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

    aes256Decrypt(encrypted: string, key: string, iv: string): string {
        const cIv = enc.Utf8.parse(iv);
        const cipher = AES.decrypt(encrypted, key, {
            mode: mode.CBC,
            padding: pad.Pkcs7,
            iv: cIv,
        });

        return cipher.toString(enc.Utf8);
    }

    jwtEncrypt(
        payload: Record<string, any>,
        options: IHelperJwtOptions
    ): string {
        return this.jwtService.sign(payload, {
            secret: options.secretKey,
            expiresIn: options.expiredIn,
            notBefore: options.notBefore || 0,
            audience: options.audience,
            issuer: options.issuer,
            subject: options.subject,
        });
    }

    jwtDecrypt(token: string): Record<string, any> {
        return this.jwtService.decode(token) as Record<string, any>;
    }

    jwtVerify(token: string, options: IHelperJwtVerifyOptions): boolean {
        try {
            this.jwtService.verify(token, {
                secret: options.secretKey,
                audience: options.audience,
                issuer: options.issuer,
                subject: options.subject,
            });
            return true;
        } catch (err: any) {
            return false;
        }
    }
}
