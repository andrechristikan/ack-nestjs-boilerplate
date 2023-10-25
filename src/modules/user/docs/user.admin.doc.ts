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
import { FileSingleDto } from 'src/common/file/dtos/file.single.dto';
import { ResponseIdSerialization } from 'src/common/response/serializations/response.id.serialization';
import {
    UserDocParamsId,
    UserDocQueryBlocked,
    UserDocQueryInactivePermanent,
    UserDocQueryIsActive,
    UserDocQueryRole,
} from 'src/modules/user/constants/user.doc.constant';
import { UserCreateDto } from 'src/modules/user/dtos/user.create.dto';
import { UserUpdateNameDto } from 'src/modules/user/dtos/user.update-name.dto';
import { UserGetSerialization } from 'src/modules/user/serializations/user.get.serialization';
import { UserListSerialization } from 'src/modules/user/serializations/user.list.serialization';

export function UserAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all of users',
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
            apiKey: true,
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
            summary: 'get detail an user',
        }),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<UserGetSerialization>('user.get', {
            serialization: UserGetSerialization,
        })
    );
}

export function UserAdminActiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'make user be active',
        }),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse('user.active')
    );
}

export function UserAdminInactiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'make user be inactive',
        }),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse('user.inactive')
    );
}

export function UserAdminBlockedDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'block a user',
        }),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse('user.blocked')
    );
}

export function UserAdminCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create a user',
        }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            body: UserCreateDto,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<ResponseIdSerialization>('user.create', {
            httpStatus: HttpStatus.CREATED,
            serialization: ResponseIdSerialization,
        })
    );
}

export function UserAdminUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update data a user',
        }),
        DocRequest({
            params: UserDocParamsId,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            body: UserUpdateNameDto,
        }),
        DocAuth({
            apiKey: true,
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
            summary: 'delete a user',
        }),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse('user.delete')
    );
}

export function UserAdminImportDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'import users with excel',
        }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocRequestFile({
            body: FileSingleDto,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse('user.import', {
            httpStatus: HttpStatus.CREATED,
        })
    );
}

export function UserAdminExportDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'export user into excel',
        }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponseFile()
    );
}
