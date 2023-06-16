import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/constants/doc.enum.constant';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocRequestFile,
    DocGuard,
    DocResponse,
    DocResponseFile,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { ResponseIdSerialization } from 'src/common/response/serializations/response.id.serialization';
import {
    UserDocParamsId,
    UserDocQueryBlocked,
    UserDocQueryInactivePermanent,
    UserDocQueryIsActive,
    UserDocQueryRole,
} from 'src/modules/user/constants/user.doc.constant';
import { UserGetSerialization } from 'src/modules/user/serializations/user.get.serialization';
import { UserListSerialization } from 'src/modules/user/serializations/user.list.serialization';

export function UserAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            operation: 'modules.admin.user',
        }),
        DocRequest({
            queries: [
                ...UserDocQueryIsActive,
                ...UserDocQueryBlocked,
                ...UserDocQueryInactivePermanent,
                ...UserDocQueryRole,
            ],
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<UserListSerialization>('user.list', {
            serialization: UserListSerialization,
        })
    );
}

export function UserAdminGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            operation: 'modules.admin.user',
        }),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<UserGetSerialization>('user.get', {
            serialization: UserGetSerialization,
        })
    );
}

export function UserAdminCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            operation: 'modules.admin.user',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocRequest({ bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON }),
        DocGuard({ role: true, policy: true }),
        DocResponse<ResponseIdSerialization>('user.create', {
            httpStatus: HttpStatus.CREATED,
            serialization: ResponseIdSerialization,
        })
    );
}

export function UserAdminActiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            operation: 'modules.admin.user',
        }),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse('user.active')
    );
}

export function UserAdminInactiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            operation: 'modules.admin.user',
        }),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse('user.inactive')
    );
}

export function UserAdminBlockedDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            operation: 'modules.admin.user',
        }),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse('user.blocked')
    );
}

export function UserAdminUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            operation: 'modules.admin.user',
        }),
        DocRequest({
            params: UserDocParamsId,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<ResponseIdSerialization>('user.update', {
            serialization: ResponseIdSerialization,
        })
    );
}

export function UserAdminDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            operation: 'modules.admin.user',
        }),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse('user.delete')
    );
}

export function UserAdminImportDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            operation: 'modules.admin.user',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocRequestFile(),
        DocGuard({ role: true, policy: true }),
        DocResponse('user.import', {
            httpStatus: HttpStatus.CREATED,
        })
    );
}

export function UserAdminExportDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            operation: 'modules.admin.user',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponseFile()
    );
}
