import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    HttpStatus,
    SetMetadata,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import { ClassConstructor } from 'class-transformer';
import { AppLanguage } from 'src/app/constants/app.constant';
import { REQUEST_PARAM_CLASS_DTOS_META_KEY } from 'src/common/request/constants/request.constant';
import { RequestParamRawGuard } from 'src/common/request/guards/request.param.guard';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { IResult } from 'ua-parser-js';
import 'dotenv/config';
import { RequestTimestampInterceptor } from 'src/common/request/interceptors/request.timestamp.interceptor';
import { RequestUserAgentInterceptor } from 'src/common/request/interceptors/request.user-agent.interceptor';
import { ResponseDocOneOf } from 'src/common/response/decorators/response.decorator';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/constants/request.status-code.constant';

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
    return applyDecorators(
        ApiHeader({
            name: 'x-timestamp',
            description: 'Timestamp header, in microseconds',
            required: true,
            schema: {
                example: 1662876305642,
                type: 'number',
            },
        }),
        UseInterceptors(RequestTimestampInterceptor)
    );
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

export function RequestHeaderDoc(): any {
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
            name: 'user-agent',
            description: 'User agent header',
            required: true,
            schema: {
                example:
                    'Mozilla/5.0 (platform; rv:geckoversion) Gecko/geckotrail Firefox/firefoxversion',
                type: 'string',
            },
        }),
        ResponseDocOneOf(
            HttpStatus.FORBIDDEN,
            {
                statusCode:
                    ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_USER_AGENT_INVALID_ERROR,
                messagePath: 'request.error.userAgentInvalid',
            },
            {
                statusCode:
                    ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_USER_AGENT_BROWSER_INVALID_ERROR,
                messagePath: 'request.error.userAgentBrowserInvalid',
            },
            {
                statusCode:
                    ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_USER_AGENT_OS_INVALID_ERROR,
                messagePath: 'request.error.userAgentOsInvalid',
            },
            {
                statusCode:
                    ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_TIMESTAMP_INVALID_ERROR,
                messagePath: 'request.error.timestampInvalid',
            }
        )
    );
}
