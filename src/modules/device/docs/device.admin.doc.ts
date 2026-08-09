import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { UserDocParamsId } from '@modules/user/constants/user.doc.constant';
import { DeviceOwnershipResponseDto } from '@modules/device/dtos/response/device.ownership.response.dto';
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
        DocResponsePaging<DeviceOwnershipResponseDto>('device.list', {
            dto: DeviceOwnershipResponseDto,
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
