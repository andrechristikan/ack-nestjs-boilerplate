import { Injectable } from '@nestjs/common';
import { WordArray, HmacSHA512, enc, lib } from 'crypto-js';
import { JwtService } from '@nestjs/jwt';
import { PASSWORD_SALT_LENGTH } from 'auth/auth.constant'; 

@Injectable()
export class AuthService {
    constructor(
        private jwtService: JwtService
    ) {}

    async hashPassword(passwordString: string): Promise<Record<string, any>> {
        return new Promise(resolve => {
            const salt: string = lib.WordArray.random(PASSWORD_SALT_LENGTH).toString();
            const passwordHashed: WordArray = HmacSHA512(passwordString, salt);
            const password: string = passwordHashed.toString(enc.Base64);
            resolve({ password, salt });
        });
    }

    async createAccessToken(payload: Record<string, any>): Promise<string> {
        return new Promise(resolve => {
            const accessToken = this.jwtService.sign(payload);
            resolve(accessToken);
        });
    }
}
