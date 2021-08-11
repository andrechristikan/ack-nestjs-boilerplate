import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler
} from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { HashService } from 'src/hash/hash.service';
import { Request } from 'express';
import rawBody from 'raw-body';

@Injectable()
export class DecryptionInterceptor
    implements NestInterceptor<Promise<any> | string> {
    constructor(
        private readonly hashService: HashService,
        private readonly configService: ConfigService
    ) {}

    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<Promise<any> | string>> {
        const ctx: HttpArgumentsHost = context.switchToHttp();
        const request: Request = ctx.getRequest<Request>();

        if (request.readable) {
            const raw = (await rawBody(request)).toString().trim();
            const iv: string = this.configService.get<string>(
                'hash.encryptionIv'
            );
            const key: string = this.configService.get<string>(
                'hash.encryptionKey'
            );

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

        return next.handle();
    }
}
