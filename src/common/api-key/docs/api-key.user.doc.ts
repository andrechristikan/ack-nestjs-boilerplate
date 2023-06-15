import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
    ApiKeyDocParamsId,
    ApiKeyDocQueryIsActive,
} from 'src/common/api-key/constants/api-key.doc';
import { ApiKeyCreateSerialization } from 'src/common/api-key/serializations/api-key.create.serialization';
import { ApiKeyGetSerialization } from 'src/common/api-key/serializations/api-key.get.serialization';
import { ApiKeyListSerialization } from 'src/common/api-key/serializations/api-key.list.serialization';
import { ApiKeyResetSerialization } from 'src/common/api-key/serializations/api-key.reset.serialization';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { ResponseIdSerialization } from 'src/common/response/serializations/response.id.serialization';

export function ApiKeyUserListDoc(): MethodDecorator {
    return applyDecorators(
        Doc(),
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

export function ApiKeyUserGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc(),
        DocRequest({
            params: ApiKeyDocParamsId,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponse<ApiKeyGetSerialization>('apiKey.get', {
            serialization: ApiKeyGetSerialization,
        })
    );
}

export function ApiKeyUserCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc(),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponse<ApiKeyCreateSerialization>('apiKey.create', {
            httpStatus: HttpStatus.CREATED,
            serialization: ApiKeyCreateSerialization,
        })
    );
}

export function ApiKeyUserActiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc(),
        DocRequest({
            params: ApiKeyDocParamsId,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponse('apiKey.active')
    );
}

export function ApiKeyUserInactiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc(),
        DocRequest({
            params: ApiKeyDocParamsId,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponse('apiKey.inactive')
    );
}

export function ApiKeyUserResetDoc(): MethodDecorator {
    return applyDecorators(
        Doc(),
        DocRequest({
            params: ApiKeyDocParamsId,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponse<ApiKeyResetSerialization>('apiKey.reset', {
            serialization: ApiKeyResetSerialization,
        })
    );
}

export function ApiKeyUserUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc(),
        DocRequest({
            params: ApiKeyDocParamsId,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponse<ResponseIdSerialization>('apiKey.update', {
            serialization: ResponseIdSerialization,
        })
    );
}

export function ApiKeyUserDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc(),
        DocRequest({
            params: ApiKeyDocParamsId,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponse('apiKey.delete')
    );
}
