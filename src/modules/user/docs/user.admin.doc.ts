import { HttpStatus, applyDecorators } from '@nestjs/common';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/constants/doc.enum.constant';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocGuard,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import {
    UserDocParamsId,
    UserDocQueryBlocked,
    UserDocQueryRole,
    UserDocQueryStatus,
} from 'src/modules/user/constants/user.doc.constant';
import { UserCreateRequestDto } from 'src/modules/user/dtos/request/user.create.request.dto';
import { UserLoginHistoryListResponseDto } from 'src/modules/user/dtos/response/user-login-history.list.response.dto';
import { UserPasswordHistoryListResponseDto } from 'src/modules/user/dtos/response/user-password-history.list.response.dto';
import { UserStateHistoryListResponseDto } from 'src/modules/user/dtos/response/user-state-history.list.response.dto';
import { UserListResponseDto } from 'src/modules/user/dtos/response/user.list.response.dto';
import { UserProfileResponseDto } from 'src/modules/user/dtos/response/user.profile.response.dto';

export function UserAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all users',
        }),
        DocRequest({
            queries: [
                ...UserDocQueryStatus,
                ...UserDocQueryBlocked,
                ...UserDocQueryRole,
            ],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<UserListResponseDto>('user.list', {
            dto: UserListResponseDto,
        })
    );
}

export function UserAdminGetStateHistoryListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all user state histories',
        }),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<UserStateHistoryListResponseDto>(
            'user.stateHistoryList',
            {
                dto: UserStateHistoryListResponseDto,
            }
        )
    );
}

export function UserAdminGetPasswordHistoryListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all user history change password',
        }),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<UserPasswordHistoryListResponseDto>(
            'user.passwordHistoryList',
            {
                dto: UserPasswordHistoryListResponseDto,
            }
        )
    );
}

export function UserAdminGetLoginHistoryListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all user login history',
        }),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<UserLoginHistoryListResponseDto>(
            'user.loginHistoryList',
            {
                dto: UserLoginHistoryListResponseDto,
            }
        )
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
        DocGuard({ role: true, policy: true }),
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
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: UserCreateRequestDto,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<DatabaseIdResponseDto>('user.create', {
            httpStatus: HttpStatus.CREATED,
            dto: DatabaseIdResponseDto,
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
            xApiKey: true,
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
            xApiKey: true,
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
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse('user.blocked')
    );
}

export function UserAdminUpdatePasswordDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update user password',
        }),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse('user.updatePassword')
    );
}
