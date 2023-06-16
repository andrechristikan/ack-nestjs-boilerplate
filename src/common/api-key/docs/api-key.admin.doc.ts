import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
    ApiKeyDocParamsId,
    ApiKeyDocQueryIsActive,
} from 'src/common/api-key/constants/api-key.doc';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/common/api-key/constants/api-key.status-code.constant';
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
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { ResponseIdSerialization } from 'src/common/response/serializations/response.id.serialization';

export function ApiKeyAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ operation: 'common.admin.apiKey' }),
        DocRequest({
            queries: ApiKeyDocQueryIsActive,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponsePaging<ApiKeyListSerialization>('apiKey.list', {
            serialization: ApiKeyListSerialization,
        })
    );
}

export function ApiKeyAdminGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ operation: 'common.admin.apiKey' }),
        DocRequest({
            params: ApiKeyDocParamsId,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponse<ApiKeyGetSerialization>('apiKey.get', {
            serialization: ApiKeyGetSerialization,
        }),
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
        Doc({ operation: 'common.admin.apiKey' }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocRequest({ bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON }),
        DocResponse<ApiKeyCreateSerialization>('apiKey.create', {
            httpStatus: HttpStatus.CREATED,
            serialization: ApiKeyCreateSerialization,
        })
    );
}

export function ApiKeyAdminActiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ operation: 'common.admin.apiKey' }),
        DocRequest({
            params: ApiKeyDocParamsId,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponse('apiKey.active'),
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
        Doc({ operation: 'common.admin.apiKey' }),
        DocRequest({
            params: ApiKeyDocParamsId,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponse('apiKey.inactive'),
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
        Doc({ operation: 'common.admin.apiKey' }),
        DocRequest({
            params: ApiKeyDocParamsId,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
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
        Doc({ operation: 'common.admin.apiKey' }),
        DocRequest({
            params: ApiKeyDocParamsId,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
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

export function ApiKeyAdminDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ operation: 'common.admin.apiKey' }),
        DocRequest({
            params: ApiKeyDocParamsId,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponse('apiKey.delete')
    );
}
