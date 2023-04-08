import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
    ApiKeyDocParamsGet,
    ApiKeyDocQueryIsActive,
} from 'src/common/api-key/constants/api-key.doc';
import { ApiKeyCreateSerialization } from 'src/common/api-key/serializations/api-key.create.serialization';
import { ApiKeyGetSerialization } from 'src/common/api-key/serializations/api-key.get.serialization';
import { ApiKeyListSerialization } from 'src/common/api-key/serializations/api-key.list.serialization';
import { Doc, DocPaging } from 'src/common/doc/decorators/doc.decorator';
import { ResponseIdSerialization } from 'src/common/response/serializations/response.id.serialization';

export function ApiKeyAdminListDoc(): MethodDecorator {
    return applyDecorators(
        DocPaging<ApiKeyListSerialization>('apiKey.list', {
            auth: {
                jwtAccessToken: true,
            },
            request: {
                queries: ApiKeyDocQueryIsActive,
            },
            response: {
                serialization: ApiKeyListSerialization,
            },
        })
    );
}

export function ApiKeyAdminGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc<ApiKeyGetSerialization>('apiKey.get', {
            auth: {
                jwtAccessToken: true,
            },
            request: {
                params: ApiKeyDocParamsGet,
            },
            response: { serialization: ApiKeyGetSerialization },
        })
    );
}

export function ApiKeyAdminCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc<ApiKeyCreateSerialization>('apiKey.create', {
            auth: {
                jwtAccessToken: true,
            },
            response: {
                httpStatus: HttpStatus.CREATED,
                serialization: ApiKeyCreateSerialization,
            },
        })
    );
}

export function ApiKeyAdminActiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc<void>('apiKey.active', {
            auth: {
                jwtAccessToken: true,
            },
            request: {
                params: ApiKeyDocParamsGet,
            },
        })
    );
}

export function ApiKeyAdminInactiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc<void>('apiKey.inactive', {
            auth: {
                jwtAccessToken: true,
            },
            request: {
                params: ApiKeyDocParamsGet,
            },
        })
    );
}

export function ApiKeyAdminResetDoc(): MethodDecorator {
    return applyDecorators(
        Doc<void>('apiKey.reset', {
            auth: {
                jwtAccessToken: true,
            },
            request: {
                params: ApiKeyDocParamsGet,
            },
            response: {
                serialization: ApiKeyCreateSerialization,
            },
        })
    );
}

export function ApiKeyAdminUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc<ResponseIdSerialization>('apiKey.update', {
            auth: {
                jwtAccessToken: true,
            },
            request: {
                params: ApiKeyDocParamsGet,
            },
            response: {
                serialization: ResponseIdSerialization,
            },
        })
    );
}
