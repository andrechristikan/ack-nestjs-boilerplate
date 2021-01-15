import { Injectable } from '@nestjs/common';
import { IPagination } from 'helper/helper.interface';
import { PAGINATION } from 'helper/helper.constant';
import { WordArray, HmacSHA512, enc, lib } from 'crypto-js';
import { PASSWORD_SALT_LENGTH } from 'helper/helper.constant';
import { Config } from 'config/config.decorator';
import { ConfigService } from 'config/config.service';

@Injectable()
export class HelperService {
    constructor(@Config() private readonly configService: ConfigService) {}

    async pagination(setPage: number, setLimit?: number): Promise<IPagination> {
        const defaultLimit: number =
            parseInt(this.configService.getEnv('PAGINATION')) || PAGINATION;

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
            parseInt(this.configService.getEnv('PASSWORD_SALT_LENGTH')) ||
            PASSWORD_SALT_LENGTH;
        const salt: string = lib.WordArray.random(
            defaultPasswordSaltLength
        ).toString();
        return salt;
    }
}
