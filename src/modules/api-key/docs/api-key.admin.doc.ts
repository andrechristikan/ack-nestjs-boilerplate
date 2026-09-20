import { HttpStatus, applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePagination,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import {
    ApiKeyDefaultAvailableOrderBy,
    ApiKeyDefaultAvailableSearch,
} from '@modules/api-key/constants/api-key.list.constant';
import { ApiKeyDocQueryList } from '@modules/api-key/constants/api-key.doc.constant';
import { ApiKeyCreateResponseSchema } from '@modules/api-key/dtos/response/api-key.create.response.dto';
import type { ApiKeyCreateResponseDto } from '@modules/api-key/dtos/response/api-key.create.response.dto';
import { ApiKeyResponseSchema } from '@modules/api-key/dtos/response/api-key.response.dto';
import type { ApiKeyResponseDto } from '@modules/api-key/dtos/response/api-key.response.dto';

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
        DocGuard({ user: true, policy: true, role: true, termPolicy: true }),
        DocResponsePagination<ApiKeyResponseDto>('apiKey.list', {
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
        DocGuard({ user: true, policy: true, role: true, termPolicy: true }),
        DocResponse<ApiKeyCreateResponseDto>('apiKey.create', {
            httpStatus: HttpStatus.CREATED,
            schema: ApiKeyCreateResponseSchema,
        })
    );
}

export function ApiKeyAdminResetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'reset secret an api key' }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ user: true, policy: true, role: true, termPolicy: true }),
        DocResponse<ApiKeyCreateResponseDto>('apiKey.reset', {
            schema: ApiKeyCreateResponseSchema,
        })
    );
}

export function ApiKeyAdminUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'update data an api key' }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ user: true, policy: true, role: true, termPolicy: true }),
        DocResponse<ApiKeyResponseDto>('apiKey.update', {
            schema: ApiKeyResponseSchema,
        })
    );
}

export function ApiKeyAdminUpdateDateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'update date of api key' }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ user: true, policy: true, role: true, termPolicy: true }),
        DocResponse<ApiKeyResponseDto>('apiKey.updateDate', {
            schema: ApiKeyResponseSchema,
        })
    );
}

export function ApiKeyAdminUpdateStatusDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'update status of an api key' }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse<ApiKeyResponseDto>('apiKey.updateStatus', {
            schema: ApiKeyResponseSchema,
        }),
        DocGuard({ user: true, policy: true, role: true, termPolicy: true })
    );
}

export function ApiKeyAdminDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'delete an api key' }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ user: true, policy: true, role: true, termPolicy: true }),
        DocResponse<ApiKeyResponseDto>('apiKey.delete', {
            schema: ApiKeyResponseSchema,
        })
    );
}
