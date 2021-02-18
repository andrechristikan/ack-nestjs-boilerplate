import { Injectable } from '@nestjs/common';
import { PASSWORD_SALT_LENGTH } from 'src/hash/hash.constant';
import { ConfigService } from '@nestjs/config';
import { hashSync, genSaltSync, compareSync } from 'bcrypt';
import { AES, enc, lib, mode } from 'crypto-js';
import { isString } from 'class-validator';

@Injectable()
export class HashService {
    constructor(private readonly configService: ConfigService) {}

    // Password
    async hashPassword(passwordString: string, salt: string): Promise<string> {
        return hashSync(passwordString, salt);
    }

    async randomSalt(): Promise<string> {
        // Env Variable
        const defaultPasswordSaltLength: number =
            this.configService.get('app.hash.passwordLatLength') ||
            PASSWORD_SALT_LENGTH;

        return genSaltSync(defaultPasswordSaltLength);
    }

    async validatePassword(
        passwordString: string,
        passwordHashed: string
    ): Promise<boolean> {
        return compareSync(passwordString, passwordHashed);
    }

    // Basic Token
    async createBasicToken(
        clientId: string,
        clientSecret: string
    ): Promise<string> {
        const token: string = `${clientId}:${clientSecret}`;
        return this.encryptBase64(token);
    }

    async validateBasicToken(
        clientBasicToken: string,
        ourBasicToken: string
    ): Promise<boolean> {
        if (ourBasicToken !== clientBasicToken) {
            return false;
        }
        return true;
    }

    // Base64
    async encryptBase64(data: string): Promise<string> {
        const basicToken: lib.WordArray = enc.Utf8.parse(data);
        return basicToken.toString(enc.Base64);
    }

    // AES 256bit
    async encryptAES256Bit(
        data: string | Record<string, any> | Record<string, any>[],
        key: string,
        iv?: string
    ): Promise<string> {
        let dataParse: string = data as string;
        const keyParse: lib.WordArray = enc.Utf8.parse(key);
        if (!isString(data)) {
            dataParse = JSON.stringify(data);
        }

        if (iv) {
            const ivParse: lib.WordArray = enc.Utf8.parse(iv);
            const encrypted: lib.CipherParams = AES.encrypt(
                dataParse,
                keyParse,
                {
                    mode: mode.CBC,
                    iv: ivParse
                }
            );
            return encrypted.toString();
        }
        const encrypted: lib.CipherParams = AES.encrypt(dataParse, keyParse, {
            mode: mode.CBC
        });
        return encrypted.toString();
    }

    async decryptAES256Bit(
        encrypted: string,
        key: string,
        iv?: string
    ): Promise<string> {
        const keyParse: lib.WordArray = enc.Utf8.parse(key);
        if (iv) {
            const ivParse: lib.WordArray = enc.Utf8.parse(iv);
            const en: lib.WordArray = AES.decrypt(encrypted, keyParse, {
                mode: mode.CBC,
                iv: ivParse
            });
            return en.toString(enc.Utf8);
        }

        const en: lib.WordArray = AES.decrypt(encrypted, keyParse, {
            mode: mode.CBC
        });
        return en.toString(enc.Utf8);
    }
}
