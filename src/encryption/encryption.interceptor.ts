import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { HashService } from 'src/hash/hash.service';
import {
    ENCRYPTION_ENCRYPT,
    ENCRYPTION_IV,
    ENCRYPTION_KEY
} from 'src/encryption/encryption.constant';
import { IResponse, IResponseSuccess } from 'src/response/response.interface';
import {
    IResponseErrorEncryption,
    IResponseSuccessEncryption
} from './encryption.interface';

@Injectable()
export class EncryptionInterceptor
    implements NestInterceptor<Promise<any> | Observable<never>> {
    constructor(
        private readonly hashService: HashService,
        private readonly configService: ConfigService
    ) {}

    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<Promise<any> | Observable<never>>> {
        // Env Variable
        const iv: string =
            this.configService.get('app.encryption.iv') || ENCRYPTION_IV;
        const key: string =
            this.configService.get('app.encryption.key') || ENCRYPTION_KEY;
        const encrypt: boolean =
            this.configService.get('app.encryption.encrypt') ||
            ENCRYPTION_ENCRYPT;

        return next.handle().pipe(
            map(async (response: IResponseSuccess) => {
                const { statusCode, message, data } = response;
                if (encrypt && data) {
                    const en: string = await this.hashService.encryptAES256Bit(
                        data,
                        key,
                        iv
                    );

                    const responseEn: IResponseSuccessEncryption = {
                        statusCode,
                        message,
                        data: en
                    };
                    return responseEn;
                }
                return data;
            }),
            catchError(async (err: any) => {
                const { response } = err;
                const { statusCode, message, errors } = response;
                if (encrypt && errors) {
                    const en: string = await this.hashService.encryptAES256Bit(
                        response.errors,
                        key,
                        iv
                    );
                    const responseEn: IResponseErrorEncryption = {
                        statusCode,
                        message,
                        errors: en
                    };
                    err.response = responseEn;
                    return throwError(err).toPromise();
                } else {
                    return throwError(err).toPromise();
                }
            })
        );
    }
}
