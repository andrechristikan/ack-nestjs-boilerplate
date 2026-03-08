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
import { DeviceDocParamsId } from '@modules/device/constants/device.doc.constant';
import { DeviceResponseDto } from '@modules/device/dtos/response/device.response.dto';
import { UserSendEmailVerificationRequestDto } from '@modules/user/dtos/request/user.send-email-verification.request.dto';
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
        DocResponsePaging<DeviceResponseDto>('device.list', {
            dto: DeviceResponseDto,
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
            dto: UserSendEmailVerificationRequestDto,
        }),
        DocResponse('device.refresh')
    );
}

export function DeviceSharedRemoveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get detail an user',
        }),
        DocRequest({
            params: DeviceDocParamsId,
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
