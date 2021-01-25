import { UseGuards } from '@nestjs/common';
import { JwtGuard } from 'auth/guard/jwt/jwt.guard';
import { LocalGuard } from 'auth/guard/local/local.guard';
import { BasicGuard } from 'auth/guard/basic/basic.guard';
import { applyDecorators } from '@nestjs/common';
import { IApplyDecorator } from 'auth/auth.interface';

export function AuthJwt(): IApplyDecorator {
    return applyDecorators(UseGuards(JwtGuard));
}

export function AuthLocal(): IApplyDecorator {
    return applyDecorators(UseGuards(LocalGuard));
}

export function AuthBasic(): IApplyDecorator {
    return applyDecorators(UseGuards(BasicGuard));
}
