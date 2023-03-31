import { applyDecorators, HttpStatus } from '@nestjs/common';
import { Doc, DocPaging } from 'src/common/doc/decorators/doc.decorator';
import { ResponseIdSerialization } from 'src/common/response/serializations/response.id.serialization';
import {
    UserDocParamsGet,
    UserDocQueryBlocked,
    UserDocQueryIsActive,
} from 'src/modules/user/constants/user.doc.constant';
import {
    USER_DEFAULT_AVAILABLE_SEARCH,
    USER_DEFAULT_AVAILABLE_ORDER_BY,
} from 'src/modules/user/constants/user.list.constant';
import { UserGetSerialization } from 'src/modules/user/serializations/user.get.serialization';
import { UserImportSerialization } from 'src/modules/user/serializations/user.import.serialization';
import { UserListSerialization } from 'src/modules/user/serializations/user.list.serialization';

export function UserListDoc(): MethodDecorator {
    return applyDecorators(
        DocPaging<UserListSerialization>('user.list', {
            auth: {
                jwtAccessToken: true,
                permissionToken: true,
            },
            request: {
                queries: [...UserDocQueryIsActive, ...UserDocQueryBlocked],
            },
            response: {
                serialization: UserListSerialization,
                availableOrderBy: USER_DEFAULT_AVAILABLE_ORDER_BY,
                availableSearch: USER_DEFAULT_AVAILABLE_SEARCH,
            },
        })
    );
}

export function UserGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc<UserGetSerialization>('user.get', {
            auth: {
                jwtAccessToken: true,
                permissionToken: true,
            },
            request: {
                params: UserDocParamsGet,
            },
            response: { serialization: UserGetSerialization },
        })
    );
}

export function UserCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc<ResponseIdSerialization>('user.create', {
            auth: {
                jwtAccessToken: true,
                permissionToken: true,
            },
            response: {
                httpStatus: HttpStatus.CREATED,
                serialization: ResponseIdSerialization,
            },
        })
    );
}

export function UserUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc<ResponseIdSerialization>('user.update', {
            auth: {
                jwtAccessToken: true,
                permissionToken: true,
            },
            request: {
                params: UserDocParamsGet,
            },
            response: { serialization: ResponseIdSerialization },
        })
    );
}

export function UserDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc<void>('user.delete', {
            auth: {
                jwtAccessToken: true,
                permissionToken: true,
            },
            request: {
                params: UserDocParamsGet,
            },
        })
    );
}

export function UserImportDoc(): MethodDecorator {
    return applyDecorators(
        Doc<UserImportSerialization>('user.import', {
            auth: {
                jwtAccessToken: true,
                permissionToken: true,
            },
            response: {
                httpStatus: HttpStatus.CREATED,
                serialization: UserImportSerialization,
            },
        })
    );
}

export function UserExportDoc(): MethodDecorator {
    return applyDecorators(
        Doc('user.export', {
            auth: {
                jwtAccessToken: true,
                permissionToken: true,
            },
            response: {
                httpStatus: HttpStatus.OK,
            },
        })
    );
}

export function UserActiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc<void>('user.active', {
            auth: {
                jwtAccessToken: true,
                permissionToken: true,
            },
            request: {
                params: UserDocParamsGet,
            },
        })
    );
}

export function UserInactiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc<void>('user.inactive', {
            auth: {
                jwtAccessToken: true,
                permissionToken: true,
            },
            request: {
                params: UserDocParamsGet,
            },
        })
    );
}

export function UserBlockedDoc(): MethodDecorator {
    return applyDecorators(
        Doc<void>('user.blocked', {
            auth: {
                jwtAccessToken: true,
                permissionToken: true,
            },
            request: {
                params: UserDocParamsGet,
            },
        })
    );
}
