import { PaginationCursorQuery } from '@common/pagination/decorators/pagination.decorator';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
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
import { DeviceCursorAvailableOrderBy } from '@modules/device/constants/device.list.constant';
import { DeviceRefreshRequestSchema } from '@modules/device/dtos/request/device.refresh.request.dto';
import type { DeviceRefreshRequestDto } from '@modules/device/dtos/request/device.refresh.request.dto';
import { DeviceOwnershipResponseSchema } from '@modules/device/dtos/response/device.ownership.response.dto';
import type { IDeviceOwnershipDetail } from '@modules/device/interfaces/device.interface';
import { DeviceHttpService } from '@modules/device/services/device.http.service';
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
    constructor(private readonly deviceHttpService: DeviceHttpService) {}

    @DeviceSharedListDoc()
    @ResponsePaging('device.list', {
        schema: DeviceOwnershipResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/list')
    async list(
        @PaginationCursorQuery({
            availableOrderBy: DeviceCursorAvailableOrderBy,
        })
        pagination: IPaginationQueryCursorParams<Prisma.DeviceOwnershipWhereInput>,
        @AuthJwtPayload('userId') userId: string,
        @AuthJwtPayload('sessionId') sessionId: string
    ): Promise<IResponsePagingReturn<IDeviceOwnershipDetail>> {
        return this.deviceHttpService.getListCursor(
            userId,
            sessionId,
            pagination
        );
    }

    @DeviceSharedRefreshDoc()
    @Response('device.refresh')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @HttpCode(HttpStatus.OK)
    @Post('/refresh')
    async refresh(
        @AuthJwtPayload('userId') userId: string,
        @AuthJwtPayload('deviceOwnershipId') deviceOwnershipId: string,
        @Body({ schema: DeviceRefreshRequestSchema })
        body: DeviceRefreshRequestDto
    ): Promise<void> {
        await this.deviceHttpService.refresh(userId, deviceOwnershipId, body);
    }

    @DeviceSharedRemoveDoc()
    @Response('device.remove')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Delete('/remove/:deviceOwnershipId')
    async remove(
        @AuthJwtPayload('userId') userId: string,
        @Param('deviceOwnershipId', { schema: RequestUuidSchema })
        deviceOwnershipId: string
    ): Promise<void> {
        await this.deviceHttpService.remove(userId, deviceOwnershipId);
    }
}
