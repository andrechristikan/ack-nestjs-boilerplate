import { EnumRequestContextScope } from '@common/request/enums/request.enum';
import type { DeviceSharedListRequestDto } from '@modules/device/dtos/request/device.shared-list.request.dto';
import { DeviceSharedListRequestSchema } from '@modules/device/dtos/request/device.shared-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import {
    RequestContextCurrent,
    RequestThrottle,
} from '@common/request/decorators/request.decorator';
import type { IRequestContextUser } from '@common/request/interfaces/request.interface';
import { RequestMongoIdSchema } from '@common/request/validations/request.mongo-id.validation';
import {
    Response,
    ResponsePagination,
} from '@common/response/decorators/response.decorator';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { DeviceRefreshRequestSchema } from '@modules/device/dtos/request/device.refresh.request.dto';
import type { DeviceRefreshRequestDto } from '@modules/device/dtos/request/device.refresh.request.dto';
import { DeviceOwnershipResponseSchema } from '@modules/device/dtos/response/device.ownership.response.dto';
import type { IDeviceOwnershipDetail } from '@modules/device/interfaces/device.interface';
import { DeviceGetListCursorUseCase } from '@modules/device/use-cases/device.get-list-cursor.use-case';
import { DeviceRefreshUseCase } from '@modules/device/use-cases/device.refresh.use-case';
import { DeviceRemoveUseCase } from '@modules/device/use-cases/device.remove.use-case';
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
    Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.shared.user.device')
@Controller({
    version: '1',
    path: '/user/device',
})
export class DeviceSharedController {
    constructor(
        private readonly deviceGetListCursorUseCase: DeviceGetListCursorUseCase,
        private readonly deviceRefreshUseCase: DeviceRefreshUseCase,
        private readonly deviceRemoveUseCase: DeviceRemoveUseCase
    ) {}

    @Doc({ summary: 'get all user devices' })
    @ResponsePagination('device.list', {
        schema: DeviceOwnershipResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @RequestContextCurrent(EnumRequestContextScope.user)
        context: IRequestContextUser,
        @Query({ schema: DeviceSharedListRequestSchema })
        query: DeviceSharedListRequestDto
    ): Promise<IResponsePaginationReturn<IDeviceOwnershipDetail>> {
        return this.deviceGetListCursorUseCase.execute(context, query);
    }

    @Doc({ summary: 'refresh device information' })
    @Response('device.refresh')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/refresh')
    async refresh(
        @RequestContextCurrent(EnumRequestContextScope.user)
        context: IRequestContextUser,
        @Body({ schema: DeviceRefreshRequestSchema })
        body: DeviceRefreshRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.deviceRefreshUseCase.execute(context, body);
    }

    @Doc({ summary: 'remove a user device' })
    @Response('device.remove')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/remove/:deviceOwnershipId')
    async remove(
        @RequestContextCurrent(EnumRequestContextScope.user)
        context: IRequestContextUser,
        @Param('deviceOwnershipId', { schema: RequestMongoIdSchema })
        deviceOwnershipId: string
    ): Promise<IResponseReturn<void>> {
        return this.deviceRemoveUseCase.execute(context, deviceOwnershipId);
    }
}
