import { HttpStatus, applyDecorators } from '@nestjs/common';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocGuard,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import {
    UserDocParamsId,
    UserDocQueryCountry,
    UserDocQueryRoleType,
    UserDocQueryStatus,
} from 'src/modules/user/constants/user.doc.constant';
import { UserCreateRequestDto } from 'src/modules/user/dtos/request/user.create.request.dto';
import { UserUpdateStatusRequestDto } from 'src/modules/user/dtos/request/user.update-status.request.dto';
import { UserUpdateRequestDto } from 'src/modules/user/dtos/request/user.update.request.dto';
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
                ...UserDocQueryRoleType,
                ...UserDocQueryCountry,
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

export function UserAdminUpdateStatusDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update status of user',
        }),
        DocRequest({
            params: UserDocParamsId,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: UserUpdateStatusRequestDto,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse('user.updateStatus')
    );
}

export function UserAdminUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update a user',
        }),
        DocRequest({
            params: UserDocParamsId,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: UserUpdateRequestDto,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse('user.update')
    );
}
