import { applyDecorators, HttpStatus } from '@nestjs/common';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/constants/doc.enum.constant';
import {
    Doc,
    DocAuth,
    DocDefault,
    DocErrorGroup,
    DocGuard,
    DocOneOf,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import {
    ApiKeyDocParamsId,
    ApiKeyDocQueryIsActive,
    ApiKeyDocQueryType,
} from 'src/common/api-key/constants/api-key.doc.constant';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/common/api-key/constants/api-key.status-code.constant';
import { ApiKeyCreateRequestDto } from 'src/common/api-key/dtos/request/api-key.create.request.dto';
import { ApiKeyUpdateDateRequestDto } from 'src/common/api-key/dtos/request/api-key.update-date.request.dto';
import { ApiKeyUpdateRequestDto } from 'src/common/api-key/dtos/request/api-key.update.request.dto';
import { ApiKeyCreateResponseDto } from 'src/common/api-key/dtos/response/api-key.create.dto';
import { ApiKeyGetResponseDto } from 'src/common/api-key/dtos/response/api-key.get.response.dto';
import { ApiKeyListResponseDto } from 'src/common/api-key/dtos/response/api-key.list.response.dto';
import { ApiKeyResetResponseDto } from 'src/common/api-key/dtos/response/api-key.reset.dto';

export function ApiKeyAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get list of api keys' }),
        DocRequest({
            queries: [...ApiKeyDocQueryIsActive, ...ApiKeyDocQueryType],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponsePaging<ApiKeyListResponseDto>('apiKey.list', {
            dto: ApiKeyListResponseDto,
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
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse<ApiKeyGetResponseDto>('apiKey.get', {
            dto: ApiKeyGetResponseDto,
        }),
        DocGuard({ policy: true }),
        DocErrorGroup([
            DocDefault({
                httpStatus: HttpStatus.NOT_FOUND,
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.NOT_FOUND_ERROR,
                messagePath: 'apiKey.error.notFound',
            }),
        ])
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
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: ApiKeyCreateRequestDto,
        }),
        DocGuard({ policy: true }),
        DocResponse<ApiKeyCreateResponseDto>('apiKey.create', {
            httpStatus: HttpStatus.CREATED,
            dto: ApiKeyCreateResponseDto,
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
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('apiKey.active'),
        DocGuard({ policy: true }),
        DocErrorGroup([
            DocDefault({
                httpStatus: HttpStatus.NOT_FOUND,
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.NOT_FOUND_ERROR,
                messagePath: 'apiKey.error.notFound',
            }),
            DocOneOf(
                HttpStatus.BAD_REQUEST,
                {
                    statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.EXPIRED_ERROR,
                    messagePath: 'apiKey.error.expired',
                },
                {
                    statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.IS_ACTIVE_ERROR,
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
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('apiKey.inactive'),
        DocGuard({ policy: true }),
        DocErrorGroup([
            DocDefault({
                httpStatus: HttpStatus.NOT_FOUND,
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.NOT_FOUND_ERROR,
                messagePath: 'apiKey.error.notFound',
            }),
            DocOneOf(
                HttpStatus.BAD_REQUEST,
                {
                    statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.EXPIRED_ERROR,
                    messagePath: 'apiKey.error.expired',
                },
                {
                    statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.IS_ACTIVE_ERROR,
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
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponse<ApiKeyResetResponseDto>('apiKey.reset', {
            dto: ApiKeyResetResponseDto,
        }),
        DocErrorGroup([
            DocDefault({
                httpStatus: HttpStatus.NOT_FOUND,
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.NOT_FOUND_ERROR,
                messagePath: 'apiKey.error.notFound',
            }),
            DocOneOf(
                HttpStatus.BAD_REQUEST,
                {
                    statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.EXPIRED_ERROR,
                    messagePath: 'apiKey.error.expired',
                },
                {
                    statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.IS_ACTIVE_ERROR,
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
            dto: ApiKeyUpdateRequestDto,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponse('apiKey.update'),
        DocErrorGroup([
            DocDefault({
                httpStatus: HttpStatus.NOT_FOUND,
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.NOT_FOUND_ERROR,
                messagePath: 'apiKey.error.notFound',
            }),
            DocOneOf(
                HttpStatus.BAD_REQUEST,
                {
                    statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.EXPIRED_ERROR,
                    messagePath: 'apiKey.error.expired',
                },
                {
                    statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.IS_ACTIVE_ERROR,
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
            dto: ApiKeyUpdateDateRequestDto,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponse<DatabaseIdResponseDto>('apiKey.updateDate', {
            dto: DatabaseIdResponseDto,
        }),
        DocErrorGroup([
            DocDefault({
                httpStatus: HttpStatus.NOT_FOUND,
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.NOT_FOUND_ERROR,
                messagePath: 'apiKey.error.notFound',
            }),
            DocOneOf(
                HttpStatus.BAD_REQUEST,
                {
                    statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.EXPIRED_ERROR,
                    messagePath: 'apiKey.error.expired',
                },
                {
                    statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.IS_ACTIVE_ERROR,
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
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponse('apiKey.delete')
    );
}
