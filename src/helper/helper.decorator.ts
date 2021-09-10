import { Inject, applyDecorators, UseInterceptors } from '@nestjs/common';
import { IAuthApplyDecorator } from 'src/auth/auth.interface';
import { FileInterceptor } from '@nestjs/platform-express';

export function Helper(): (
    target: Record<string, any>,
    key: string | symbol,
    index?: number
) => void {
    return Inject(`HelperService`);
}

export function File(field: string): IAuthApplyDecorator {
    return applyDecorators(UseInterceptors(FileInterceptor(field)));
}
