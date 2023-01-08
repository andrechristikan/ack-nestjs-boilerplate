import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
    ApiKeyDocParamsGet,
    ApiKeyDocQueryIsActive,
} from 'src/common/api-key/constants/api-key.doc';
import {
    API_KEY_DEFAULT_AVAILABLE_SEARCH,
    API_KEY_DEFAULT_AVAILABLE_SORT,
} from 'src/common/api-key/constants/api-key.list.constant';
import { ApiKeyCreateSerialization } from 'src/common/api-key/serializations/api-key.create.serialization';
import { ApiKeyGetSerialization } from 'src/common/api-key/serializations/api-key.get.serialization';
import { ApiKeyListSerialization } from 'src/common/api-key/serializations/api-key.list.serialization';
import { Doc, DocPaging } from 'src/common/doc/decorators/doc.decorator';
import { ResponseIdSerialization } from 'src/common/response/serializations/response.id.serialization';

export function ApiKeyListDoc(): MethodDecorator {
    return applyDecorators(
        DocPaging<ApiKeyListSerialization>('apiKey.list', {
            auth: {
                jwtAccessToken: true,
                permissionToken: true,
            },
            request: {
                queries: ApiKeyDocQueryIsActive,
            },
            response: {
                serialization: ApiKeyListSerialization,
                availableSort: API_KEY_DEFAULT_AVAILABLE_SORT,
                availableSearch: API_KEY_DEFAULT_AVAILABLE_SEARCH,
            },
        })
    );
}

export function ApiKeyGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc<ApiKeyGetSerialization>('apiKey.get', {
            auth: {
                jwtAccessToken: true,
                permissionToken: true,
            },
            request: {
                params: ApiKeyDocParamsGet,
            },
            response: { serialization: ApiKeyGetSerialization },
        })
    );
}

export function ApiKeyCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc<ApiKeyCreateSerialization>('apiKey.create', {
            auth: {
                jwtAccessToken: true,
                permissionToken: true,
            },
            response: {
                httpStatus: HttpStatus.CREATED,
                serialization: ApiKeyCreateSerialization,
            },
        })
    );
}

export function ApiKeyActiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc<void>('apiKey.active', {
            auth: {
                jwtAccessToken: true,
                permissionToken: true,
            },
            request: {
                params: ApiKeyDocParamsGet,
            },
        })
    );
}

export function ApiKeyInactiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc<void>('apiKey.inactive', {
            auth: {
                jwtAccessToken: true,
                permissionToken: true,
            },
            request: {
                params: ApiKeyDocParamsGet,
            },
        })
    );
}

export function ApiKeyResetDoc(): MethodDecorator {
    return applyDecorators(
        Doc<void>('apiKey.reset', {
            auth: {
                jwtAccessToken: true,
                permissionToken: true,
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

export function ApiKeyUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc<ResponseIdSerialization>('apiKey.update', {
            auth: {
                jwtAccessToken: true,
                permissionToken: true,
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
