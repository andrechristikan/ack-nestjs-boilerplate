import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePagination,
} from '@common/doc/decorators/doc.decorator';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { UserDocParamsId } from '@modules/user/constants/user.doc.constant';
import { DeviceOwnershipResponseSchema } from '@modules/device/dtos/response/device.ownership.response.dto';
import type { DeviceOwnershipResponseDto } from '@modules/device/dtos/response/device.ownership.response.dto';
import { DeviceDefaultAvailableOrderBy } from '@modules/device/constants/device.list.constant';
import {
    DeviceOwnershipDocParamsId,
    DeviceOwnershipDocQueryList,
} from '@modules/device/constants/device.doc.constant';

export function DeviceAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'admin get all user Devices',
        }),
        DocRequest({
            params: UserDocParamsId,
            queries: DeviceOwnershipDocQueryList,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponsePagination<DeviceOwnershipResponseDto>('device.list', {
            schema: DeviceOwnershipResponseSchema,
            availableOrderBy: DeviceDefaultAvailableOrderBy,
            type: EnumPaginationType.offset,
        })
    );
}

export function DeviceAdminRemoveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'admin remove user Device',
        }),
        DocRequest({
            params: [...UserDocParamsId, ...DeviceOwnershipDocParamsId],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponse('device.remove')
    );
}
