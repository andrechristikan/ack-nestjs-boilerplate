import {
    applyDecorators,
    Inject,
    UseFilters,
    UseInterceptors
} from '@nestjs/common';
import { IApplyDecorator } from 'src/auth/auth.interface';
import { ResponseFilter } from 'src/response/response.filter';
import { EncryptionInterceptor } from './interceptor/encryption.interceptor';
import { DecryptionInterceptor } from './interceptor/decryption.interceptor';

export function Encryption(): IApplyDecorator {
    return applyDecorators(
        UseInterceptors(EncryptionInterceptor),
        UseFilters(ResponseFilter)
    );
}

export function Decryption(): IApplyDecorator {
    return applyDecorators(
        UseInterceptors(DecryptionInterceptor),
        UseFilters(ResponseFilter)
    );
}
