import { Inject } from '@nestjs/common';
import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { IApplyDecorator } from 'src/auth/auth.interface';
import { HashEncryptionInterceptor } from './hash.interceptor';

export function Hash(): (
    target: Record<string, any>,
    key: string | symbol,
    index?: number
) => void {
    return Inject(`HashService`);
}

export function Encryption(): IApplyDecorator {
    return applyDecorators(UseInterceptors(HashEncryptionInterceptor));
}
