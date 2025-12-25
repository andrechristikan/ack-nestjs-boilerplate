import { HttpStatus, applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocRequestFile,
    DocResponse,
    DocResponseFile,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { UserListResponseDto } from '@modules/user/dtos/response/user.list.response.dto';
import { UserProfileResponseDto } from '@modules/user/dtos/response/user.profile.response.dto';
import {
    UserDocParamsId,
    UserDocQueryList,
} from '@modules/user/constants/user.doc.constant';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
import { FileSingleDto } from '@common/file/dtos/file.single.dto';
import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';

export function UserAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all users',
        }),
        DocRequest({
            queries: UserDocQueryList,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponsePaging<UserListResponseDto>('user.list', {
            dto: UserListResponseDto,
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
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponse<UserProfileResponseDto>('user.get', {
            dto: UserProfileResponseDto,
        })
    );
}

export function UserAdminCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create a user',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: UserCreateRequestDto,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponse<DatabaseIdDto>('user.create', {
            httpStatus: HttpStatus.CREATED,
            dto: DatabaseIdDto,
        })
    );
}

export function UserAdminUpdateStatusDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update status of user',
        }),
        DocRequest({
            params: UserDocParamsId,
            bodyType: EnumDocRequestBodyType.json,
            dto: UserUpdateStatusRequestDto,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponse('user.updateStatus')
    );
}

export function UserAdminUpdatePasswordDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update password of user',
        }),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponse('user.updatePassword')
    );
}

export function UserAdminResetTwoFactorDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: "Reset user's two-factor authentication",
        }),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponse('user.twoFactor.reset')
    );
}

export function UserAdminImportDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'import users via csv file',
        }),
        DocRequestFile({
            dto: FileSingleDto,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponse('user.import', {
            httpStatus: HttpStatus.CREATED,
        })
    );
}

export function UserAdminExportDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'export users via csv file',
        }),
        DocRequest({
            queries: UserDocQueryList,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponseFile({
            extension: EnumFileExtensionDocument.csv,
        })
    );
}
