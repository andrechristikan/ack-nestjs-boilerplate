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
    ENCRYPTION_ENCRYPT,
    ENCRYPTION_IV,
    ENCRYPTION_KEY
} from 'src/encryption/encryption.constant';

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
        const encrypt: boolean =
            this.configService.get('app.encryption.encrypt') ||
            ENCRYPTION_ENCRYPT;

        return next.handle().pipe(
            map(async (response: Record<string, any> | string) => {
                if (encrypt) {
                    const en: string = await this.hashService.encryptAES256Bit(
                        response,
                        key,
                        iv
                    );
                    return en;
                }
                return response;
            })
        );
    }
}
