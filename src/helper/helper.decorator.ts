import { Inject, applyDecorators, UseInterceptors } from '@nestjs/common';
import { IAuthApplyDecorator } from 'src/auth/auth.interface';
import { FileInterceptor } from '@nestjs/platform-express';
import { HelperImageInterceptor } from './interceptor/helper.image.interceptor';
import { HelperService } from './helper.service';

export function Helper(): (
    target: Record<string, any>,
    key: string | symbol,
    index?: number
) => void {
    return Inject(HelperService);
}

export function Image(field: string): IAuthApplyDecorator {
    return applyDecorators(
        UseInterceptors(FileInterceptor(field), HelperImageInterceptor)
    );
}
