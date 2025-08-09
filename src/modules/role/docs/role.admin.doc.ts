import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import {
    RoleDocParamsId,
    RoleDocQueryList,
} from '@modules/role/constants/role.doc.constant';
import { ROLE_DEFAULT_AVAILABLE_SEARCH } from '@modules/role/constants/role.list.constant';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleResponseDto } from '@modules/role/dtos/response/role.response.dto';
import { applyDecorators } from '@nestjs/common';

export function RoleAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all of roles',
        }),
        DocRequest({
            queries: RoleDocQueryList,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<RoleListResponseDto>('role.list', {
            dto: RoleListResponseDto,
            availableSearch: ROLE_DEFAULT_AVAILABLE_SEARCH,
        })
    );
}

export function RoleAdminGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get detail a role',
        }),
        DocRequest({
            params: RoleDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<RoleResponseDto>('role.get', {
            dto: RoleResponseDto,
        })
    );
}

// TODO: RESOLVE THIS
// export function RoleAdminCreateDoc(): MethodDecorator {
//     return applyDecorators(
//         Doc({
//             summary: 'create a role',
//         }),
//         DocAuth({
//             xApiKey: true,
//             jwtAccessToken: true,
//         }),
//         DocRequest({
//             bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
//             dto: RoleCreateRequestDto,
//         }),
//         DocGuard({ role: true, policy: true }),
//         DocResponse<DatabaseIdResponseDto>('role.create', {
//             httpStatus: HttpStatus.CREATED,
//             dto: DatabaseIdResponseDto,
//         })
//     );
// }

// export function RoleAdminActiveDoc(): MethodDecorator {
//     return applyDecorators(
//         Doc({
//             summary: 'make role be active',
//         }),
//         DocRequest({
//             params: RoleDocParamsId,
//         }),
//         DocAuth({
//             xApiKey: true,
//             jwtAccessToken: true,
//         }),
//         DocGuard({ role: true, policy: true }),
//         DocResponse('role.active')
//     );
// }

// export function RoleAdminInactiveDoc(): MethodDecorator {
//     return applyDecorators(
//         Doc({
//             summary: 'make role be inactive',
//         }),
//         DocRequest({
//             params: RoleDocParamsId,
//         }),
//         DocAuth({
//             xApiKey: true,
//             jwtAccessToken: true,
//         }),
//         DocGuard({ role: true, policy: true }),
//         DocResponse('role.inactive')
//     );
// }

// export function RoleAdminUpdateDoc(): MethodDecorator {
//     return applyDecorators(
//         Doc({
//             summary: 'update data a role',
//         }),
//         DocRequest({
//             params: RoleDocParamsId,
//             bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
//             dto: RoleUpdateRequestDto,
//         }),
//         DocAuth({
//             xApiKey: true,
//             jwtAccessToken: true,
//         }),
//         DocGuard({ role: true, policy: true }),
//         DocResponse<DatabaseIdResponseDto>('role.update', {
//             dto: DatabaseIdResponseDto,
//         })
//     );
// }

// export function RoleAdminDeleteDoc(): MethodDecorator {
//     return applyDecorators(
//         Doc({
//             summary: 'delete data a role',
//         }),
//         DocRequest({
//             params: RoleDocParamsId,
//         }),
//         DocAuth({
//             xApiKey: true,
//             jwtAccessToken: true,
//         }),
//         DocGuard({ role: true, policy: true }),
//         DocResponse('role.delete')
//     );
// }
