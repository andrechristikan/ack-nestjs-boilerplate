import { Injectable } from '@nestjs/common';
import { WordArray, HmacSHA512, enc, lib } from 'crypto-js';
import { ConfigService } from 'config/config.service';
import { Config } from 'config/config.decorator';

@Injectable()
export class AuthService {
    constructor(@Config() private readonly configService: ConfigService) {}

    async hashPassword(passwordString: string): Promise<Record<string, any>> {
        return new Promise(resolve => {
            const salt: string = lib.WordArray.random(this.configService.getEnv('PASSWORD_SALT_LENGTH')).toString();
            const passwordHashed: WordArray = HmacSHA512(passwordString, salt);
            const password: string = passwordHashed.toString(enc.Base64);
            resolve({ password, salt });
        });
    }
}
