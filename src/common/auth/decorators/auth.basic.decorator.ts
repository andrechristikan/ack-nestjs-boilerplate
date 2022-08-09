import { applyDecorators, UseGuards } from '@nestjs/common';
import { BasicGuard } from '../guards/basic/auth.basic.guard';

export function AuthBasicGuard(): any {
    return applyDecorators(UseGuards(BasicGuard));
}
