import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { UserDocParamsId } from '@modules/user/constants/user.doc.constant';
import {
    DeviceOwnershipResponseDto,
    DeviceOwnershipResponseSchema,
} from '@modules/device/dtos/response/device.ownership.response.dto';
import {
    DeviceOwnershipDocParamsId,
    DeviceOwnershipDocQueryList,
} from '@modules/device/constants/device.doc.constant';
import { DeviceDefaultAvailableOrderBy } from '@modules/device/constants/device.list.constant';

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
        DocResponsePaging<DeviceOwnershipResponseDto>('device.list', {
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
