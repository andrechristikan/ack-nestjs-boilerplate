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

export function ApiKeyAdminListDoc(): MethodDecorator {
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

export function ApiKeyAdminGetDoc(): MethodDecorator {
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

export function ApiKeyAdminCreateDoc(): MethodDecorator {
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

export function ApiKeyAdminActiveDoc(): MethodDecorator {
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

export function ApiKeyAdminInactiveDoc(): MethodDecorator {
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

export function ApiKeyAdminResetDoc(): MethodDecorator {
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

export function ApiKeyAdminUpdateDoc(): MethodDecorator {
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

export function ApiKeyAdminDeleteDoc(): MethodDecorator {
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
