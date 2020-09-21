import { Injectable } from '@nestjs/common';
import { WordArray, HmacSHA512, enc } from 'crypto-js';
import { ConfigService } from 'config/config.service';

@Injectable()
export class AuthService {
    constructor(private readonly configService: ConfigService) {}

    async hashPassword(passwordString: string): Promise<string> {
        return new Promise(resolve => {
            const passwordHashed: WordArray = HmacSHA512(
                passwordString,
                this.configService.getEnv('PASSWORD_SALT'),
            );
            const passwordDigest: string = passwordHashed.toString(enc.Base64);
            resolve(passwordDigest);
        });
    }
}
