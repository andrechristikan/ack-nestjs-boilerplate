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
        return next.handle().pipe(
            map(async (response: Promise<Record<string, any> | string>) => {
                const data: Record<string, any> | string = await response;
                const iv: string = this.configService.get<string>(
                    'hash.encryptionIv'
                );
                const key: string = this.configService.get<string>(
                    'hash.encryptionKey'
                );

                return this.hashService.encryptAES256Bit(data, key, iv);
            })
        );
    }
}
