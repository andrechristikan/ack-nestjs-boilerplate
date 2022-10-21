import { applyDecorators, HttpStatus } from '@nestjs/common';
import { Doc, DocPaging } from 'src/common/doc/decorators/doc.decorator';
import { ResponseIdSerialization } from 'src/common/response/serializations/response.id.serialization';
import { UserDocParamsGet } from 'src/modules/user/constants/user.doc.constant';
import {
    USER_DEFAULT_AVAILABLE_SEARCH,
    USER_DEFAULT_AVAILABLE_SORT,
} from 'src/modules/user/constants/user.list.constant';
import { UserGetSerialization } from 'src/modules/user/serializations/user.get.serialization';
import { UserImportSerialization } from 'src/modules/user/serializations/user.import.serialization';
import { UserListSerialization } from 'src/modules/user/serializations/user.list.serialization';

export function UserListDoc(): any {
    return applyDecorators(
        DocPaging<UserListSerialization>('user.list', {
            auth: {
                jwtAccessToken: true,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
            response: {
                classSerialization: UserListSerialization,
                availableSort: USER_DEFAULT_AVAILABLE_SORT,
                availableSearch: USER_DEFAULT_AVAILABLE_SEARCH,
            },
        })
    );
}

export function UserGetDoc(): any {
    return applyDecorators(
        Doc<UserGetSerialization>('user.get', {
            auth: {
                jwtAccessToken: true,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
            request: {
                params: UserDocParamsGet,
            },
            response: { classSerialization: UserGetSerialization },
        })
    );
}

export function UserCreateDoc(): any {
    return applyDecorators(
        Doc<ResponseIdSerialization>('user.create', {
            auth: {
                jwtAccessToken: true,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
            response: {
                httpStatus: HttpStatus.CREATED,
                classSerialization: ResponseIdSerialization,
            },
        })
    );
}

export function UserUpdateDoc(): any {
    return applyDecorators(
        Doc<ResponseIdSerialization>('user.update', {
            auth: {
                jwtAccessToken: true,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
            request: {
                params: UserDocParamsGet,
            },
            response: { classSerialization: ResponseIdSerialization },
        })
    );
}

export function UserDeleteDoc(): any {
    return applyDecorators(
        Doc<void>('user.delete', {
            auth: {
                jwtAccessToken: true,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
            request: {
                params: UserDocParamsGet,
            },
        })
    );
}

export function UserActiveDoc(): any {
    return applyDecorators(
        Doc<void>('user.active', {
            auth: {
                jwtAccessToken: true,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
            request: {
                params: UserDocParamsGet,
            },
        })
    );
}

export function UserInactiveDoc(): any {
    return applyDecorators(
        Doc<void>('user.inactive', {
            auth: {
                jwtAccessToken: true,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
            request: {
                params: UserDocParamsGet,
            },
        })
    );
}

export function UserImportDoc(): any {
    return applyDecorators(
        Doc<UserImportSerialization>('user.import', {
            auth: {
                jwtAccessToken: true,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
            response: {
                httpStatus: HttpStatus.CREATED,
                classSerialization: UserImportSerialization,
            },
        })
    );
}
