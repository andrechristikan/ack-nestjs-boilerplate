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
import { DeviceResponseDto } from '@modules/device/dtos/response/device.response.dto';
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
        DocResponsePaging<DeviceResponseDto>('device.list', {
            dto: DeviceResponseDto,
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
