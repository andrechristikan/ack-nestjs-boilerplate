import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HashService } from 'src/hash/hash.service';
import {
    ENCRYPTION_IV,
    ENCRYPTION_KEY
} from 'src/encryption/encryption.constant';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Request } from 'express';
import rawBody from 'raw-body';

@Injectable()
export class EncryptionInterceptor
    implements NestInterceptor<Promise<any> | string> {
    constructor(
        private readonly hashService: HashService,
        private readonly configService: ConfigService
    ) {}

    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<Promise<any> | string>> {
        // Env Variable
        const iv: string =
            this.configService.get('app.encryption.iv') || ENCRYPTION_IV;
        const key: string =
            this.configService.get('app.encryption.key') || ENCRYPTION_KEY;

        const ctx: HttpArgumentsHost = context.switchToHttp();
        const request: Request = ctx.getRequest<Request>();

        if (request.readable) {
            const raw = (await rawBody(request)).toString().trim();
            const decryption: string = await this.hashService.decryptAES256Bit(
                raw,
                key,
                iv
            );

            try {
                const jsonBody: Record<string, any> = JSON.parse(decryption);
                request.body = jsonBody;
            } catch (err: any) {
                request.body = raw;
            }
        }

        return next.handle().pipe(
            map(async (response: Promise<Record<string, any> | string>) => {
                const data: Record<string, any> | string = await response;
                return this.hashService.encryptAES256Bit(data, key, iv);
            })
        );
    }
}
