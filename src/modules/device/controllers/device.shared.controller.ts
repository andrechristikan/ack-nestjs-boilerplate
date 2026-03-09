import { PaginationCursorQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import {
    RequestGeoLocation,
    RequestIPAddress,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
import { RequestIsValidObjectIdPipe } from '@common/request/pipes/request.is-valid-object-id.pipe';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { GeoLocation, Prisma, UserAgent } from '@generated/prisma-client';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import {
    DeviceSharedListDoc,
    DeviceSharedRefreshDoc,
    DeviceSharedRemoveDoc,
} from '@modules/device/docs/device.shared.doc';
import { DeviceRefreshRequestDto } from '@modules/device/dtos/requests/device.refresh.dto';
import { DeviceRequestDto } from '@modules/device/dtos/requests/device.request.dto';
import { DeviceOwnershipResponseDto } from '@modules/device/dtos/response/device.ownership.response';
import { DeviceService } from '@modules/device/services/device.service';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.shared.user.device')
@Controller({
    version: '1',
    path: '/user/device',
})
export class DeviceSharedController {
    constructor(private readonly deviceService: DeviceService) {}

    @DeviceSharedListDoc()
    @ResponsePaging('device.list')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationCursorQuery()
        pagination: IPaginationQueryCursorParams<
            Prisma.DeviceOwnershipSelect,
            Prisma.DeviceOwnershipWhereInput
        >,
        @AuthJwtPayload('userId') userId: string,
        @AuthJwtPayload('sessionId') sessionId: string
    ): Promise<IResponsePagingReturn<DeviceOwnershipResponseDto>> {
        return this.deviceService.getListCursor(userId, sessionId, pagination);
    }

    @DeviceSharedRefreshDoc()
    @Response('device.refresh')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/refresh')
    async device(
        @AuthJwtPayload('userId') userId: string,
        @AuthJwtPayload('deviceOwnershipId') deviceOwnershipId: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: UserAgent,
        @RequestGeoLocation() geoLocation: GeoLocation | null,
        @Body() body: DeviceRefreshRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.deviceService.refresh(userId, deviceOwnershipId, body, {
            ipAddress,
            userAgent,
            geoLocation,
        });
    }

    @DeviceSharedRemoveDoc()
    @Response('device.remove')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Delete('/remove/:deviceOwnershipId')
    async remove(
        @AuthJwtPayload('userId') userId: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: UserAgent,
        @RequestGeoLocation() geoLocation: GeoLocation | null,
        @Param(
            'deviceOwnershipId',
            RequestRequiredPipe,
            RequestIsValidObjectIdPipe
        )
        deviceOwnershipId: string
    ): Promise<IResponseReturn<void>> {
        return this.deviceService.remove(userId, deviceOwnershipId, {
            ipAddress,
            userAgent,
            geoLocation,
        });
    }
}
