import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    SetMetadata,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { ClassConstructor } from 'class-transformer';
import { REQUEST_PARAM_CLASS_DTOS_META_KEY } from 'src/common/request/constants/request.constant';
import { RequestParamRawGuard } from 'src/common/request/guards/request.param.guard';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { IResult } from 'ua-parser-js';
import 'dotenv/config';
import { RequestTimestampInterceptor } from 'src/common/request/interceptors/request.timestamp.interceptor';
import { RequestUserAgentInterceptor } from 'src/common/request/interceptors/request.user-agent.interceptor';

export const RequestUserAgent = createParamDecorator(
    (data: string, ctx: ExecutionContext): IResult => {
        const { userAgent } = ctx.switchToHttp().getRequest() as IRequestApp;
        return userAgent;
    }
);

export function RequestValidateUserAgent(): any {
    return applyDecorators(UseInterceptors(RequestUserAgentInterceptor));
}

export function RequestValidateTimestamp(): any {
    return applyDecorators(UseInterceptors(RequestTimestampInterceptor));
}

export const RequestId = createParamDecorator(
    (data: string, ctx: ExecutionContext): string => {
        const { id } = ctx.switchToHttp().getRequest() as IRequestApp;
        return id;
    }
);

export const RequestTimestamp = createParamDecorator(
    (data: string, ctx: ExecutionContext): number => {
        const { timestamp } = ctx.switchToHttp().getRequest() as IRequestApp;
        return timestamp;
    }
);

export const RequestCustomLang = createParamDecorator(
    (data: string, ctx: ExecutionContext): string[] => {
        const { customLang } = ctx.switchToHttp().getRequest() as IRequestApp;
        return customLang;
    }
);

export function RequestParamGuard(
    ...classValidation: ClassConstructor<any>[]
): any {
    return applyDecorators(
        UseGuards(RequestParamRawGuard),
        SetMetadata(REQUEST_PARAM_CLASS_DTOS_META_KEY, classValidation)
    );
}
