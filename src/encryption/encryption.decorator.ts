import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { IApplyDecorator } from 'src/auth/auth.interface';
import { EncryptionInterceptor } from './encryption.interceptor';

// ongoing
// buat filter untuk encryption catch
export function Encryption(): IApplyDecorator {
    return applyDecorators(UseInterceptors(EncryptionInterceptor));
}
