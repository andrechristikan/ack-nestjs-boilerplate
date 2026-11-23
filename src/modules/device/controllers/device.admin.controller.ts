import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import type { DeviceAdminListRequestDto } from '@modules/device/dtos/request/device.admin-list.request.dto';
import { DeviceAdminListRequestSchema } from '@modules/device/dtos/request/device.admin-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import {
    RequestContext,
    RequestThrottle,
} from '@common/request/decorators/request.decorator';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import {
    Response,
    ResponsePagination,
} from '@common/response/decorators/response.decorator';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import {
    ApiKeyContext,
    ApiKeyProtected,
} from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessContext,
    AuthJwtAccessProtected,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { DeviceOwnershipResponseSchema } from '@modules/device/dtos/response/device.ownership.response.dto';
import type { IDeviceOwnershipDetail } from '@modules/device/interfaces/device.interface';
import { DeviceGetListOffsetByAdminUseCase } from '@modules/device/use-cases/device.get-list-offset-by-admin.use-case';
import { DeviceRemoveByAdminUseCase } from '@modules/device/use-cases/device.remove-by-admin.use-case';
import {
    PolicyContext,
    PolicyProtected,
} from '@modules/policy/decorators/policy.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import {
    UserContext,
    UserProtected,
} from '@modules/user/decorators/user.decorator';
import { Controller, Delete, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';

@ApiTags('modules.admin.user.device')
@Controller({
    version: '1',
    path: '/user/:userId/device',
})
export class DeviceAdminController {
    constructor(
        private readonly deviceGetListOffsetByAdminUseCase: DeviceGetListOffsetByAdminUseCase,
        private readonly deviceRemoveByAdminUseCase: DeviceRemoveByAdminUseCase
    ) {}

    @Doc({ summary: 'admin get all user Devices' })
    @ResponsePagination('device.list', {
        schema: DeviceOwnershipResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected(
        {
            subject: EnumPolicySubject.User,
            action: [EnumPolicyAction.read],
        },
        {
            subject: EnumPolicySubject.Device,
            action: [EnumPolicyAction.read],
        }
    )
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PolicyContext() policyContext: IPolicyContext,
        @Param('userId', { schema: RequestUuidSchema })
        userId: string,
        @Query({ schema: DeviceAdminListRequestSchema })
        query: DeviceAdminListRequestDto
    ): Promise<IResponsePaginationReturn<IDeviceOwnershipDetail>> {
        return this.deviceGetListOffsetByAdminUseCase.execute(
            policyContext,
            userId,
            query
        );
    }

    @Doc({ summary: 'admin remove user Device' })
    @Response('device.remove')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected(
        {
            subject: EnumPolicySubject.User,
            action: [EnumPolicyAction.read],
        },
        {
            subject: EnumPolicySubject.Device,
            action: [EnumPolicyAction.read, EnumPolicyAction.delete],
        }
    )
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/remove/:deviceOwnershipId')
    async remove(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @UserContext() userContext: IUserContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Param('userId', { schema: RequestUuidSchema })
        userId: string,
        @Param('deviceOwnershipId', { schema: RequestUuidSchema })
        deviceOwnershipId: string
    ): Promise<IResponseReturn<void>> {
        return this.deviceRemoveByAdminUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            userContext,
            policyContext,
            userId,
            deviceOwnershipId
        );
    }
}
