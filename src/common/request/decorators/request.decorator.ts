import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    SetMetadata,
    UseGuards,
} from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import { ClassConstructor } from 'class-transformer';
import { AppLanguage } from 'src/app/constants/app.constant';
import {
    REQUEST_EXCLUDE_TIMESTAMP_META_KEY,
    REQUEST_PARAM_CLASS_DTOS_META_KEY,
} from 'src/common/request/constants/request.constant';
import { RequestParamRawGuard } from 'src/common/request/guards/request.param.guard';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { IResult } from 'ua-parser-js';
import 'dotenv/config';

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

export function RequestHeaderDoc(): any {
    const docs = [];

    if (process.env.APP_MODE === 'secure') {
        docs.push(
            ApiHeader({
                name: 'user-agent',
                description: 'User agent header',
                required: true,
                schema: {
                    example:
                        'Mozilla/5.0 (platform; rv:geckoversion) Gecko/geckotrail Firefox/firefoxversion',
                    type: 'string',
                },
            }),
            ApiHeader({
                name: 'x-timestamp',
                description: 'Timestamp header, in microseconds',
                required: true,
                schema: {
                    example: 1662876305642,
                    type: 'number',
                },
            })
        );
    }

    return applyDecorators(
        ApiHeader({
            name: 'x-custom-lang',
            description: 'Custom language header',
            required: false,
            schema: {
                default: AppLanguage,
                example: AppLanguage,
                type: 'string',
            },
        }),
        ApiHeader({
            name: 'x-timezone',
            description: 'Custom timezone header',
            required: false,
            schema: {
                example: 'Asia/Jakarta',
                type: 'string',
            },
        }),
        ...docs
    );
}
