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
import {
    ApiKeyDocParamsId,
    ApiKeyDocQueryList,
} from '@modules/api-key/constants/api-key.doc.constant';
import { EnumApiKeyStatusCodeError } from '@modules/api-key/enums/api-key.status-code.enum';
import { ApiKeyCreateRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import { ApiKeyUpdateDateRequestDto } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import { ApiKeyUpdateRequestDto } from '@modules/api-key/dtos/request/api-key.update.request.dto';
import { ApiKeyCreateResponseDto } from '@modules/api-key/dtos/response/api-key.create.response.dto';
import { ApiKeyDefaultAvailableSearch } from '@modules/api-key/constants/api-key.list.constant';
import { ApiKeyDto } from '@modules/api-key/dtos/api-key.dto';

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
        DocGuard({ policy: true, role: true }),
        DocResponsePaging<ApiKeyDto>('apiKey.list', {
            dto: ApiKeyDto,
            availableSearch: ApiKeyDefaultAvailableSearch,
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
            dto: ApiKeyCreateRequestDto,
        }),
        DocGuard({ policy: true, role: true }),
        DocResponse<ApiKeyCreateResponseDto>('apiKey.create', {
            httpStatus: HttpStatus.CREATED,
            dto: ApiKeyCreateResponseDto,
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
        DocResponse('apiKey.updateStatus', {
            dto: ApiKeyDto,
        }),
        DocGuard({ policy: true, role: true }),
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
        DocGuard({ policy: true, role: true }),
        DocResponse<ApiKeyCreateResponseDto>('apiKey.reset', {
            dto: ApiKeyCreateResponseDto,
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
            dto: ApiKeyUpdateRequestDto,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true, role: true }),
        DocResponse('apiKey.update', {
            dto: ApiKeyDto,
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
            dto: ApiKeyUpdateDateRequestDto,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true, role: true }),
        DocResponse('apiKey.updateDate', {
            dto: ApiKeyDto,
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
        DocGuard({ policy: true, role: true }),
        DocResponse('apiKey.delete', {
            dto: ApiKeyDto,
        }),
        DocDefault({
            httpStatus: HttpStatus.NOT_FOUND,
            statusCode: EnumApiKeyStatusCodeError.notFound,
            messagePath: 'apiKey.error.notFound',
        })
    );
}
