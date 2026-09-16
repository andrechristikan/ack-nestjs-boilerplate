import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { DeviceOwnershipDocParamsId } from '@modules/device/constants/device.doc.constant';
import { DeviceCursorAvailableOrderBy } from '@modules/device/constants/device.list.constant';
import {
    DeviceOwnershipResponseDto,
    DeviceOwnershipResponseSchema,
} from '@modules/device/dtos/response/device.ownership.response.dto';
import { applyDecorators } from '@nestjs/common';

export function DeviceSharedListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all user devices',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ termPolicy: true }),
        DocResponsePaging<DeviceOwnershipResponseDto>('device.list', {
            schema: DeviceOwnershipResponseSchema,
            availableOrderBy: DeviceCursorAvailableOrderBy,
            type: EnumPaginationType.cursor,
        })
    );
}

export function DeviceSharedRefreshDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Refresh device information',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({
            termPolicy: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocResponse('device.refresh')
    );
}

export function DeviceSharedRemoveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'remove a user device',
        }),
        DocRequest({
            params: DeviceOwnershipDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({
            termPolicy: true,
        }),
        DocResponse('device.remove')
    );
}
