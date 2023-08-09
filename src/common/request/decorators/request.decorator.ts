import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    SetMetadata,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import {ClassConstructor} from 'class-transformer';
import {
    REQUEST_CUSTOM_TIMEOUT_META_KEY,
    REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY,
    REQUEST_PARAM_CLASS_DTOS_META_KEY,
} from 'src/common/request/constants/request.constant';
import {RequestParamRawGuard} from 'src/common/request/guards/request.param.guard';
import {IRequestApp} from 'src/common/request/interfaces/request.interface';
import {IResult} from 'ua-parser-js';
import {RequestTimestampInterceptor} from 'src/common/request/interceptors/request.timestamp.interceptor';
import {RequestUserAgentInterceptor} from 'src/common/request/interceptors/request.user-agent.interceptor';
import {RequestHelmetGuard} from "../guards/helmet/request.helmet.guard";
import {RequestIdGuard} from "../guards/id/request.id.guard";
import {
    RequestJsonBodyParserGuard,
    RequestRawBodyParserGuard,
    RequestTextBodyParserGuard, RequestUrlencodedBodyParserGuard
} from "../guards/body-parser/request.body-parser.guard";
import {RequestCorsGuard} from "../guards/cors/request.cors.guard";
import {RequestVersionGuard} from "../guards/version/request.version.guard";
import {RequestUserAgentGuard} from "../guards/user-agent/request.user-agent.guard";
import {RequestTimestampGuard} from "../guards/timestamp/request.timestamp.guard";
import {RequestTimezoneGuard} from "../guards/timezone/request.timezone.guard";
import {RequestHelmetMiddleware} from "../middleware/helmet/request.helmet.middleware";
import {MessageCustomLanguageGuard} from "../../message/guard/custom-language/message.custom-language.guard";

export const RequestUserAgent: () => ParameterDecorator = createParamDecorator(
    (data: string, ctx: ExecutionContext): IResult => {
        const {__userAgent} = ctx.switchToHttp().getRequest<IRequestApp>();
        return __userAgent;
    }
);

export const RequestId: () => ParameterDecorator = createParamDecorator(
    (data: string, ctx: ExecutionContext): string => {
        const {__id} = ctx.switchToHttp().getRequest<IRequestApp>();
        return __id;
    }
);

export const RequestXTimestamp: () => ParameterDecorator = createParamDecorator(
    (data: string, ctx: ExecutionContext): number => {
        const {__xTimestamp} = ctx.switchToHttp().getRequest<IRequestApp>();
        return __xTimestamp;
    }
);

export const RequestTimestamp: () => ParameterDecorator = createParamDecorator(
    (data: string, ctx: ExecutionContext): number => {
        const {__timestamp} = ctx.switchToHttp().getRequest<IRequestApp>();
        return __timestamp;
    }
);

export const RequestCustomLang: () => ParameterDecorator = createParamDecorator(
    (data: string, ctx: ExecutionContext): string[] => {
        const {__customLang} = ctx.switchToHttp().getRequest<IRequestApp>();
        return __customLang;
    }
);

export function RequestParamGuard(
    ...classValidation: ClassConstructor<any>[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(RequestParamRawGuard),
        SetMetadata(REQUEST_PARAM_CLASS_DTOS_META_KEY, classValidation)
    );
}

export function RequestValidateUserAgent(): MethodDecorator {
    return applyDecorators(UseInterceptors(RequestUserAgentInterceptor));
}

export function RequestValidateTimestamp(): MethodDecorator {
    return applyDecorators(UseInterceptors(RequestTimestampInterceptor));
}

export function RequestTimeout(seconds: string): MethodDecorator {
    return applyDecorators(
        SetMetadata(REQUEST_CUSTOM_TIMEOUT_META_KEY, true),
        SetMetadata(REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY, seconds)
    );
}

export function GraphqlRequestDecorator(): MethodDecorator {
    return applyDecorators(
        UseGuards(RequestHelmetGuard),
        UseGuards(RequestIdGuard),
        UseGuards(RequestJsonBodyParserGuard),
        UseGuards(RequestTextBodyParserGuard),
        UseGuards(RequestRawBodyParserGuard),
        UseGuards(RequestUrlencodedBodyParserGuard),
        UseGuards(RequestCorsGuard),
        UseGuards(RequestVersionGuard),
        UseGuards(RequestUserAgentGuard),
        UseGuards(RequestTimestampGuard),
        UseGuards(RequestTimezoneGuard),
        UseGuards(MessageCustomLanguageGuard),
    )
}
