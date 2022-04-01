import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createCipheriv, createDecipheriv, scrypt } from 'crypto';
import { promisify } from 'util';
import { IHelperJwtOptions } from '../helper.interface';

@Injectable()
export class HelperEncryptionService {
    constructor(
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService
    ) {}

    async base64Encrypt(data: string): Promise<string> {
        const buff: Buffer = Buffer.from(data);
        return buff.toString('base64');
    }

    async base64Decrypt(data: string): Promise<string> {
        const buff: Buffer = Buffer.from(data, 'base64');
        return buff.toString('utf8');
    }

    async aes256Encrypt(
        data: string | Record<string, any> | Record<string, any>[],
        key: string,
        iv: string
    ): Promise<string> {
        let dataParse: string = data as string;
        if (typeof data !== 'string') {
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

    async aes256Decrypt(
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

    async jwtEncrypt(
        payload: Record<string, any>,
        options?: IHelperJwtOptions
    ): Promise<string> {
        return this.jwtService.sign(payload, {
            secret:
                options && options.secretKey
                    ? options.secretKey
                    : this.configService.get<string>('helper.jwt.secretKey'),
            expiresIn:
                options && options.expiredIn
                    ? options.expiredIn
                    : this.configService.get<string>(
                          'helper.jwt.expirationTime'
                      ),
            notBefore:
                options && options.notBefore
                    ? options.notBefore
                    : this.configService.get<string>(
                          'helper.jwt.notBeforeExpirationTime'
                      ),
        });
    }

    async jwtDecrypt(
        token: string,
        options?: IHelperJwtOptions
    ): Promise<Record<string, any>> {
        return this.jwtService.verify(token, {
            secret:
                options && options.secretKey
                    ? options.secretKey
                    : this.configService.get<string>('helper.jwt.secretKey'),
        });
    }

    async jwtVerify(
        token: string,
        options?: IHelperJwtOptions
    ): Promise<boolean> {
        const payload: Record<string, any> = this.jwtService.verify(token, {
            secret:
                options && options.secretKey
                    ? options.secretKey
                    : this.configService.get<string>('helper.jwt.secretKey'),
        });

        return payload ? true : false;
    }
}
