import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { UserSendEmailVerificationRequestDto } from '@modules/user/dtos/request/user.send-email-verification.request.dto';
import { applyDecorators } from '@nestjs/common';

export function DeviceSharedDeviceRefreshDoc(): MethodDecorator {
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
