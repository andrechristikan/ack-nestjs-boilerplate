import { HttpStatus, applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocDefault,
    DocGuard,
    DocOneOf,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import {
    ApiKeyDocParamsId,
    ApiKeyDocQueryList,
} from '@modules/api-key/constants/api-key.doc.constant';
import { EnumApiKeyStatusCodeError } from '@modules/api-key/enums/api-key.status-code.enum';
import {
    ApiKeyCreateResponseDto,
    ApiKeyCreateResponseSchema,
} from '@modules/api-key/dtos/response/api-key.create.response.dto';
import {
    ApiKeyDefaultAvailableOrderBy,
    ApiKeyDefaultAvailableSearch,
} from '@modules/api-key/constants/api-key.list.constant';
import {
    ApiKeyResponseDto,
    ApiKeyResponseSchema,
} from '@modules/api-key/dtos/response/api-key.response.dto';

export function ApiKeyAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get list of api keys' }),
        DocRequest({
            queries: ApiKeyDocQueryList,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true, role: true, termPolicy: true }),
        DocResponsePaging<ApiKeyResponseDto>('apiKey.list', {
            schema: ApiKeyResponseSchema,
            availableSearch: ApiKeyDefaultAvailableSearch,
            availableOrderBy: ApiKeyDefaultAvailableOrderBy,
            type: EnumPaginationType.offset,
        })
    );
}

export function ApiKeyAdminCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'create an api key' }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocGuard({ policy: true, role: true, termPolicy: true }),
        DocResponse<ApiKeyCreateResponseDto>('apiKey.create', {
            httpStatus: HttpStatus.CREATED,
            schema: ApiKeyCreateResponseSchema,
        }),
        DocDefault({
            httpStatus: HttpStatus.BAD_REQUEST,
            statusCode: EnumApiKeyStatusCodeError.startAtNotFuture,
            messagePath: 'apiKey.error.startAtNotFuture',
        })
    );
}

export function ApiKeyAdminUpdateStatusDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'update status of an api key' }),
        DocRequest({
            params: ApiKeyDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse<ApiKeyResponseDto>('apiKey.updateStatus', {
            schema: ApiKeyResponseSchema,
        }),
        DocGuard({ policy: true, role: true, termPolicy: true }),
        DocDefault({
            httpStatus: HttpStatus.NOT_FOUND,
            statusCode: EnumApiKeyStatusCodeError.notFound,
            messagePath: 'apiKey.error.notFound',
        }),
        DocOneOf(HttpStatus.BAD_REQUEST, {
            statusCode: EnumApiKeyStatusCodeError.expired,
            messagePath: 'apiKey.error.expired',
        })
    );
}

export function ApiKeyAdminResetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'reset secret an api key' }),
        DocRequest({
            params: ApiKeyDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true, role: true, termPolicy: true }),
        DocResponse<ApiKeyCreateResponseDto>('apiKey.reset', {
            schema: ApiKeyCreateResponseSchema,
        }),
        DocDefault({
            httpStatus: HttpStatus.NOT_FOUND,
            statusCode: EnumApiKeyStatusCodeError.notFound,
            messagePath: 'apiKey.error.notFound',
        }),
        DocOneOf(
            HttpStatus.BAD_REQUEST,
            {
                statusCode: EnumApiKeyStatusCodeError.inactive,
                messagePath: 'apiKey.error.inactive',
            },
            {
                statusCode: EnumApiKeyStatusCodeError.expired,
                messagePath: 'apiKey.error.expired',
            }
        )
    );
}

export function ApiKeyAdminUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'update data an api key' }),
        DocRequest({
            params: ApiKeyDocParamsId,
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true, role: true, termPolicy: true }),
        DocResponse<ApiKeyResponseDto>('apiKey.update', {
            schema: ApiKeyResponseSchema,
        }),
        DocDefault({
            httpStatus: HttpStatus.NOT_FOUND,
            statusCode: EnumApiKeyStatusCodeError.notFound,
            messagePath: 'apiKey.error.notFound',
        }),
        DocOneOf(
            HttpStatus.BAD_REQUEST,
            {
                statusCode: EnumApiKeyStatusCodeError.inactive,
                messagePath: 'apiKey.error.inactive',
            },
            {
                statusCode: EnumApiKeyStatusCodeError.expired,
                messagePath: 'apiKey.error.expired',
            }
        )
    );
}

export function ApiKeyAdminUpdateDateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'update date of api key' }),
        DocRequest({
            params: ApiKeyDocParamsId,
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true, role: true, termPolicy: true }),
        DocResponse<ApiKeyResponseDto>('apiKey.updateDate', {
            schema: ApiKeyResponseSchema,
        }),
        DocDefault({
            httpStatus: HttpStatus.NOT_FOUND,
            statusCode: EnumApiKeyStatusCodeError.notFound,
            messagePath: 'apiKey.error.notFound',
        }),
        DocOneOf(
            HttpStatus.BAD_REQUEST,
            {
                statusCode: EnumApiKeyStatusCodeError.inactive,
                messagePath: 'apiKey.error.inactive',
            },
            {
                statusCode: EnumApiKeyStatusCodeError.expired,
                messagePath: 'apiKey.error.expired',
            },
            {
                statusCode: EnumApiKeyStatusCodeError.startAtNotFuture,
                messagePath: 'apiKey.error.startAtNotFuture',
            }
        )
    );
}

export function ApiKeyAdminDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'delete an api key' }),
        DocRequest({
            params: ApiKeyDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true, role: true, termPolicy: true }),
        DocResponse<ApiKeyResponseDto>('apiKey.delete', {
            schema: ApiKeyResponseSchema,
        }),
        DocDefault({
            httpStatus: HttpStatus.NOT_FOUND,
            statusCode: EnumApiKeyStatusCodeError.notFound,
            messagePath: 'apiKey.error.notFound',
        })
    );
}
