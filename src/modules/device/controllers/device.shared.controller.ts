import {
    RequestGeoLocation,
    RequestIPAddress,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
import { Response } from '@common/response/decorators/response.decorator';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { GeoLocation, UserAgent } from '@generated/prisma-client';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { DeviceSharedDeviceRefreshDoc } from '@modules/device/docs/device.shared.doc';
import { DeviceDto } from '@modules/device/dtos/device.dto';
import { DeviceService } from '@modules/device/services/device.service';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.shared.user.device')
@Controller({
    version: '1',
    path: '/user/device',
})
export class DeviceSharedController {
    constructor(private readonly deviceService: DeviceService) {}

    // TODO: NEXT - LIST, FLAG CURRENT DEVICE ?

    // TODO: NEXT - REMOVE, REVOKE ALL SESSION

    @DeviceSharedDeviceRefreshDoc()
    @Response('device.refresh')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/refresh')
    async device(
        @AuthJwtPayload('userId') userId: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: UserAgent,
        @RequestGeoLocation() geoLocation: GeoLocation,
        @Body() body: DeviceDto
    ): Promise<IResponseReturn<void>> {
        return this.deviceService.refresh(userId, body, {
            ipAddress,
            userAgent,
            geoLocation,
        });
    }
}
