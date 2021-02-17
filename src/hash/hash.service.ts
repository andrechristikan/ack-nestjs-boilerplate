import { Injectable } from '@nestjs/common';
import { HmacSHA512, enc, lib } from 'crypto-js';
import { PASSWORD_SALT_LENGTH } from 'src/hash/hash.constant';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HashService {
    constructor(private readonly configService: ConfigService) {}

    async hashPassword(passwordString: string, salt: string): Promise<string> {
        const passwordHashed: lib.WordArray = HmacSHA512(passwordString, salt);
        return passwordHashed.toString(enc.Base64);
    }

    async randomSalt(): Promise<string> {
        const defaultPasswordSaltLength: number =
            this.configService.get('app.hash.passwordLatLength') ||
            PASSWORD_SALT_LENGTH;
        const salt: string = lib.WordArray.random(
            defaultPasswordSaltLength
        ).toString();
        return salt;
    }

    // Basic Token
    async createBasicToken(
        clientId: string,
        clientSecret: string
    ): Promise<string> {
        const token: string = `${clientId}:${clientSecret}`;
        return Buffer.from(token).toString('base64');
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
}
