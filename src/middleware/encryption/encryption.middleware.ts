import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import {
    ENCRYPTION_ENCRYPT,
    ENCRYPTION_IV,
    ENCRYPTION_KEY
} from 'src/encryption/encryption.constant';
import { Hash } from 'src/hash/hash.decorator';
import { HashService } from 'src/hash/hash.service';

@Injectable()
export class EncryptionMiddleware implements NestMiddleware {
    constructor(
        private readonly configService: ConfigService,
        @Hash() private readonly hashService: HashService
    ) {}

    use(req: Request, res: Response, next: NextFunction): void {
        // Env Variable
        const iv: string =
            this.configService.get('app.encryption.iv') || ENCRYPTION_IV;
        const key: string =
            this.configService.get('app.encryption.key') || ENCRYPTION_KEY;
        const encrypt: boolean =
            this.configService.get('app.encryption.encrypt') ||
            ENCRYPTION_ENCRYPT;

        if (encrypt) {
            const requestBody: string = req.body;
            this.hashService.decryptAES256Bit(
                requestBody,
                key,
                iv
            ).then( (result: string) => {
                // console.log('requestBody', req.);
                console.log('requestBody', requestBody);
                console.log('result', result);
                req.body = result;
                next();
            });
        }else{
            next();
        }
    }
}
