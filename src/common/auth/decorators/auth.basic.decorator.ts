import { applyDecorators, UseGuards } from '@nestjs/common';
import { BasicGuard } from 'src/common/auth/guards/basic/auth.basic.guard';

export function AuthBasicGuard(): any {
    return applyDecorators(UseGuards(BasicGuard));
}
