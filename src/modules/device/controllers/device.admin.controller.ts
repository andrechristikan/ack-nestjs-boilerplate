import {
    PaginationOffsetQuery,
    PaginationQueryFilterEqualBoolean,
} from '@common/pagination/decorators/pagination.decorator';
import type {
    IPaginationEqual,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import type {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
    Prisma,
} from '@generated/prisma-client/client';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import {
    DeviceAdminListDoc,
    DeviceAdminRemoveDoc,
} from '@modules/device/docs/device.admin.doc';
import { DeviceDefaultAvailableOrderBy } from '@modules/device/constants/device.list.constant';
import { DeviceOwnershipResponseSchema } from '@modules/device/dtos/response/device.ownership.response.dto';
import type { IDeviceOwnershipDetail } from '@modules/device/interfaces/device.interface';
import { DeviceHttpService } from '@modules/device/services/device.http.service';
import { PolicyProtected } from '@modules/policy/decorators/policy.decorator';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Controller, Delete, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.admin.user.device')
@Controller({
    version: '1',
    path: '/user/:userId/device',
})
export class DeviceAdminController {
    constructor(private readonly deviceHttpService: DeviceHttpService) {}

    @DeviceAdminListDoc()
    @ResponsePaging('device.list', {
        schema: DeviceOwnershipResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected(
        {
            subject: EnumPolicySubject.user,
            action: [EnumPolicyAction.read],
        },
        {
            subject: EnumPolicySubject.device,
            action: [EnumPolicyAction.read],
        }
    )
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/list')
    async list(
        @PaginationOffsetQuery({
            availableOrderBy: DeviceDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.DeviceOwnershipWhereInput>,
        @Param('userId', { schema: RequestUuidSchema })
        userId: string,
        @PaginationQueryFilterEqualBoolean('isRevoked')
        isRevoked?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<IDeviceOwnershipDetail>> {
        return this.deviceHttpService.getListOffsetByAdmin(
            userId,
            pagination,
            isRevoked
        );
    }

    @DeviceAdminRemoveDoc()
    @Response('device.remove')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected(
        {
            subject: EnumPolicySubject.user,
            action: [EnumPolicyAction.read],
        },
        {
            subject: EnumPolicySubject.device,
            action: [EnumPolicyAction.read, EnumPolicyAction.delete],
        }
    )
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Delete('/remove/:deviceOwnershipId')
    async remove(
        @AuthJwtPayload('userId') removedBy: string,
        @Param('userId', { schema: RequestUuidSchema })
        userId: string,
        @Param('deviceOwnershipId', { schema: RequestUuidSchema })
        deviceOwnershipId: string
    ): Promise<IResponseReturn<void>> {
        return this.deviceHttpService.removeByAdmin(
            userId,
            deviceOwnershipId,
            removedBy
        );
    }
}
