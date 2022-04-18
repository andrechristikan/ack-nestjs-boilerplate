import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    UseGuards,
} from '@nestjs/common';
import { ClassConstructor } from 'class-transformer';
import { IResult } from 'ua-parser-js';
import { ParamGuard } from './guard/request.param.guard';
import { IRequestApp } from './request.interface';

export const UserAgent = createParamDecorator(
    (data: string, ctx: ExecutionContext): IResult => {
        const { userAgent } = ctx.switchToHttp().getRequest() as IRequestApp;
        return userAgent;
    }
);

export function RequestParamGuard(classValidation: ClassConstructor<any>): any {
    return applyDecorators(UseGuards(ParamGuard(classValidation)));
}
