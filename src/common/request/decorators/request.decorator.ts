import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    SetMetadata,
    UseGuards,
} from '@nestjs/common';
import { ClassConstructor } from 'class-transformer';
import {
    REQUEST_EXCLUDE_TIMESTAMP_META_KEY,
    REQUEST_PARAM_CLASS_DTOS_META_KEY,
} from 'src/common/request/constants/request.constant';
import { RequestParamRawGuard } from 'src/common/request/guards/request.param.guard';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { IResult } from 'ua-parser-js';

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

export const RequestExcludeTimestamp = () =>
    SetMetadata(REQUEST_EXCLUDE_TIMESTAMP_META_KEY, true);
