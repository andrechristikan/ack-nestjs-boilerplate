import { Injectable } from '@nestjs/common';
import { PASSWORD_SALT_LENGTH } from 'src/hash/hash.constant';
import { ConfigService } from '@nestjs/config';
import { hashSync, genSaltSync, compareSync } from 'bcrypt';
import { enc, lib } from 'crypto-js';

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
        const basicToken: lib.WordArray = enc.Utf8.parse(token);
        return basicToken.toString(enc.Base64);
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
