import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    SetMetadata,
    UseGuards,
} from '@nestjs/common';
import { ClassConstructor } from 'class-transformer';
import { IResult } from 'ua-parser-js';
import { ParamGuard } from './guard/request.param.guard';
import { REQUEST_EXCLUDE_TIMESTAMP_META_KEY } from './request.constant';
import { IRequestApp } from './request.interface';

export const RequestUserAgent = createParamDecorator(
    (data: string, ctx: ExecutionContext): IResult => {
        const { userAgent } = ctx.switchToHttp().getRequest() as IRequestApp;
        return userAgent;
    }
);

export const RequestId = createParamDecorator(
    (data: string, ctx: ExecutionContext): string => {
        const { id } = ctx.switchToHttp().getRequest() as IRequestApp;
        return id;
    }
);

export const RequestTimezone = createParamDecorator(
    (data: string, ctx: ExecutionContext): string => {
        const { timezone } = ctx.switchToHttp().getRequest() as IRequestApp;
        return timezone;
    }
);

export const RequestTimestamp = createParamDecorator(
    (data: string, ctx: ExecutionContext): string => {
        const { timestamp } = ctx.switchToHttp().getRequest() as IRequestApp;
        return timestamp;
    }
);

export const RequestCustomLang = createParamDecorator(
    (data: string, ctx: ExecutionContext): string => {
        const { customLang } = ctx.switchToHttp().getRequest() as IRequestApp;
        return customLang;
    }
);

export function RequestParamGuard(
    ...classValidation: ClassConstructor<any>[]
): any {
    return applyDecorators(UseGuards(ParamGuard(classValidation)));
}

export const RequestExcludeTimestamp = () =>
    SetMetadata(REQUEST_EXCLUDE_TIMESTAMP_META_KEY, true);
