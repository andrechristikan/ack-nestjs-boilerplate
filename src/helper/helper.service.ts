import { Injectable } from '@nestjs/common';
import { IPagination } from 'helper/helper.interface';
import { PAGINATION } from 'helper/helper.constant';
import { WordArray, HmacSHA512, enc, lib } from 'crypto-js';
import { PASSWORD_SALT_LENGTH } from 'auth/auth.constant'; 


@Injectable()
export class HelperService {

    pagination(setPage: number, setLimit?: number): IPagination {
        const limit: number = PAGINATION || setLimit;
        const page: number = setPage || 1;

        const skip: number = (page - 1) * limit;
        return { 
            skip, 
            limit
        };
    }

    async hashPassword(passwordString: string): Promise<Record<string, any>> {
        return new Promise(resolve => {
            const salt: string = lib.WordArray.random(PASSWORD_SALT_LENGTH).toString();
            const passwordHashed: WordArray = HmacSHA512(passwordString, salt);
            const password: string = passwordHashed.toString(enc.Base64);
            resolve({ password, salt });
        });
    }
}