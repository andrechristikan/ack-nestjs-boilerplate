import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
    ApiKeyDocParamsId,
    ApiKeyDocQueryIsActive,
} from 'src/common/api-key/constants/api-key.doc.constant';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/common/api-key/constants/api-key.status-code.constant';
import { ApiKeyCreateDto } from 'src/common/api-key/dtos/api-key.create.dto';
import { ApiKeyUpdateDateDto } from 'src/common/api-key/dtos/api-key.update-date.dto';
import { ApiKeyUpdateDto } from 'src/common/api-key/dtos/api-key.update.dto';
import { ApiKeyCreateSerialization } from 'src/common/api-key/serializations/api-key.create.serialization';
import { ApiKeyGetSerialization } from 'src/common/api-key/serializations/api-key.get.serialization';
import { ApiKeyListSerialization } from 'src/common/api-key/serializations/api-key.list.serialization';
import { ApiKeyResetSerialization } from 'src/common/api-key/serializations/api-key.reset.serialization';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/constants/doc.enum.constant';
import {
    Doc,
    DocAuth,
    DocDefault,
    DocErrorGroup,
    DocOneOf,
    DocRequest,
    DocGuard,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { ResponseIdSerialization } from 'src/common/response/serializations/response.id.serialization';

export function ApiKeyAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get list of api keys' }),
        DocRequest({
            queries: ApiKeyDocQueryIsActive,
        }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<ApiKeyListSerialization>('apiKey.list', {
            serialization: ApiKeyListSerialization,
        })
    );
}

export function ApiKeyAdminGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get detail an api key' }),
        DocRequest({
            params: ApiKeyDocParamsId,
        }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse<ApiKeyGetSerialization>('apiKey.get', {
            serialization: ApiKeyGetSerialization,
        }),
        DocGuard({ role: true, policy: true }),
        DocErrorGroup([
            DocDefault({
                httpStatus: HttpStatus.NOT_FOUND,
                statusCode:
                    ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_NOT_FOUND_ERROR,
                messagePath: 'apiKey.error.notFound',
            }),
        ])
    );
}

export function ApiKeyAdminCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'create an api key' }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            body: ApiKeyCreateDto,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<ApiKeyCreateSerialization>('apiKey.create', {
            httpStatus: HttpStatus.CREATED,
            serialization: ApiKeyCreateSerialization,
        })
    );
}

export function ApiKeyAdminActiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'make api key be active' }),
        DocRequest({
            params: ApiKeyDocParamsId,
        }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('apiKey.active'),
        DocGuard({ role: true, policy: true }),
        DocErrorGroup([
            DocDefault({
                httpStatus: HttpStatus.NOT_FOUND,
                statusCode:
                    ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_NOT_FOUND_ERROR,
                messagePath: 'apiKey.error.notFound',
            }),
            DocOneOf(
                HttpStatus.BAD_REQUEST,
                {
                    statusCode:
                        ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_EXPIRED_ERROR,
                    messagePath: 'apiKey.error.expired',
                },
                {
                    statusCode:
                        ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_IS_ACTIVE_ERROR,
                    messagePath: 'apiKey.error.isActiveInvalid',
                }
            ),
        ])
    );
}

export function ApiKeyAdminInactiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'make api key be inactive' }),
        DocRequest({
            params: ApiKeyDocParamsId,
        }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('apiKey.inactive'),
        DocGuard({ role: true, policy: true }),
        DocErrorGroup([
            DocDefault({
                httpStatus: HttpStatus.NOT_FOUND,
                statusCode:
                    ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_NOT_FOUND_ERROR,
                messagePath: 'apiKey.error.notFound',
            }),
            DocOneOf(
                HttpStatus.BAD_REQUEST,
                {
                    statusCode:
                        ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_EXPIRED_ERROR,
                    messagePath: 'apiKey.error.expired',
                },
                {
                    statusCode:
                        ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_IS_ACTIVE_ERROR,
                    messagePath: 'apiKey.error.isActiveInvalid',
                }
            ),
        ])
    );
}

export function ApiKeyAdminResetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'reset secret an api key' }),
        DocRequest({
            params: ApiKeyDocParamsId,
        }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<ApiKeyResetSerialization>('apiKey.reset', {
            serialization: ApiKeyResetSerialization,
        }),
        DocErrorGroup([
            DocDefault({
                httpStatus: HttpStatus.NOT_FOUND,
                statusCode:
                    ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_NOT_FOUND_ERROR,
                messagePath: 'apiKey.error.notFound',
            }),
            DocOneOf(
                HttpStatus.BAD_REQUEST,
                {
                    statusCode:
                        ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_EXPIRED_ERROR,
                    messagePath: 'apiKey.error.expired',
                },
                {
                    statusCode:
                        ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_IS_ACTIVE_ERROR,
                    messagePath: 'apiKey.error.isActiveInvalid',
                }
            ),
        ])
    );
}

export function ApiKeyAdminUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'update data an api key' }),
        DocRequest({
            params: ApiKeyDocParamsId,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            body: ApiKeyUpdateDto,
        }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<ResponseIdSerialization>('apiKey.update', {
            serialization: ResponseIdSerialization,
        }),
        DocErrorGroup([
            DocDefault({
                httpStatus: HttpStatus.NOT_FOUND,
                statusCode:
                    ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_NOT_FOUND_ERROR,
                messagePath: 'apiKey.error.notFound',
            }),
            DocOneOf(
                HttpStatus.BAD_REQUEST,
                {
                    statusCode:
                        ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_EXPIRED_ERROR,
                    messagePath: 'apiKey.error.expired',
                },
                {
                    statusCode:
                        ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_IS_ACTIVE_ERROR,
                    messagePath: 'apiKey.error.isActiveInvalid',
                }
            ),
        ])
    );
}

export function ApiKeyAdminUpdateDateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'update date of api key' }),
        DocRequest({
            params: ApiKeyDocParamsId,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            body: ApiKeyUpdateDateDto,
        }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<ResponseIdSerialization>('apiKey.updateDate', {
            serialization: ResponseIdSerialization,
        }),
        DocErrorGroup([
            DocDefault({
                httpStatus: HttpStatus.NOT_FOUND,
                statusCode:
                    ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_NOT_FOUND_ERROR,
                messagePath: 'apiKey.error.notFound',
            }),
            DocOneOf(
                HttpStatus.BAD_REQUEST,
                {
                    statusCode:
                        ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_EXPIRED_ERROR,
                    messagePath: 'apiKey.error.expired',
                },
                {
                    statusCode:
                        ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_IS_ACTIVE_ERROR,
                    messagePath: 'apiKey.error.isActiveInvalid',
                }
            ),
        ])
    );
}

export function ApiKeyAdminDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'delete an api key' }),
        DocRequest({
            params: ApiKeyDocParamsId,
        }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse('apiKey.delete')
    );
}
