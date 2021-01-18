import { Injectable } from '@nestjs/common';
import { IPagination } from 'helper/helper.interface';
import { PAGINATION } from 'helper/helper.constant';
import { WordArray, HmacSHA512, enc, lib } from 'crypto-js';
import { PASSWORD_SALT_LENGTH } from 'helper/helper.constant';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HelperService {
    constructor(private readonly configService: ConfigService) {}

    async pagination(setPage: number, setLimit?: number): Promise<IPagination> {
        const defaultLimit: number =
            this.configService.get('app.helper.pagination') || PAGINATION;

        const limit: number = defaultLimit || setLimit;
        const page: number = setPage || 1;

        const skip: number = (page - 1) * limit;
        return {
            skip,
            limit
        };
    }

    async hashPassword(passwordString: string, salt: string): Promise<string> {
        return new Promise(resolve => {
            const passwordHashed: WordArray = HmacSHA512(passwordString, salt);
            const password: string = passwordHashed.toString(enc.Base64);
            resolve(password);
        });
    }

    async randomSalt(): Promise<string> {
        const defaultPasswordSaltLength: number =
            this.configService.get('app.helper.passwordLatLength') ||
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
        const basicToken: string = Buffer.from(token).toString('base64');
        return basicToken;
    }

    async validateBasicToken(
        clientBasicToken: string,
        ourBasicToken: string
    ): Promise<boolean> {
        return new Promise(resolve => {
            if (ourBasicToken === clientBasicToken) {
                resolve(true);
            }
            resolve(false);
        });
    }
}
