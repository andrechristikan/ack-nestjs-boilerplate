import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocRequestFile,
    DocResponse,
    DocResponseFile,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { ResponseIdSerialization } from 'src/common/response/serializations/response.id.serialization';
import {
    UserDocParamsId,
    UserDocQueryBlocked,
    UserDocQueryIsActive,
} from 'src/modules/user/constants/user.doc.constant';
import { UserGetSerialization } from 'src/modules/user/serializations/user.get.serialization';
import { UserListSerialization } from 'src/modules/user/serializations/user.list.serialization';

export function UserAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc(),
        DocRequest({
            queries: [...UserDocQueryIsActive, ...UserDocQueryBlocked],
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponsePaging<UserListSerialization>('user.list', {
            serialization: UserListSerialization,
        })
    );
}

export function UserAdminGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc(),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponse<UserGetSerialization>('user.get', {
            serialization: UserGetSerialization,
        })
    );
}

export function UserAdminCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc(),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponse<ResponseIdSerialization>('user.create', {
            httpStatus: HttpStatus.CREATED,
            serialization: ResponseIdSerialization,
        })
    );
}

export function UserAdminActiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc(),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponse('user.active')
    );
}

export function UserAdminInactiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc(),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponse('user.inactive')
    );
}

export function UserAdminBlockedDoc(): MethodDecorator {
    return applyDecorators(
        Doc(),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponse('user.blocked')
    );
}

export function UserAdminUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc(),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponse<ResponseIdSerialization>('user.update', {
            serialization: ResponseIdSerialization,
        })
    );
}

export function UserAdminDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc(),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponse('user.delete')
    );
}

export function UserAdminImportDoc(): MethodDecorator {
    return applyDecorators(
        Doc(),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocRequestFile(),
        DocResponse('user.import', {
            httpStatus: HttpStatus.CREATED,
        })
    );
}

export function UserAdminExportDoc(): MethodDecorator {
    return applyDecorators(
        Doc(),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponseFile()
    );
}
