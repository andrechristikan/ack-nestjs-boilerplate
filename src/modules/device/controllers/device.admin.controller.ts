import {
    PaginationOffsetQuery,
    PaginationQueryFilterEqualBoolean,
} from '@common/pagination/decorators/pagination.decorator';
import {
    IPaginationEqual,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
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
import {
    EnumActivityLogAction,
    EnumRoleType,
    GeoLocation,
    Prisma,
    UserAgent,
} from '@generated/prisma-client';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { ActivityLog } from '@modules/activity-log/decorators/activity-log.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import {
    DeviceAdminListDoc,
    DeviceAdminRemoveDoc,
} from '@modules/device/docs/device.admin.doc';
import { DeviceOwnershipResponseDto } from '@modules/device/dtos/response/device.ownership.response';
import { DeviceService } from '@modules/device/services/device.service';
import { PolicyAbilityProtected } from '@modules/policy/decorators/policy.decorator';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import {
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.admin.user.device')
@Controller({
    version: '1',
    path: '/user/:userId/device',
})
export class DeviceAdminController {
    constructor(private readonly deviceService: DeviceService) {}

    @DeviceAdminListDoc()
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected(
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
    @ResponsePaging('device.list')
    @Get('/list')
    async list(
        @PaginationOffsetQuery()
        pagination: IPaginationQueryOffsetParams<
            Prisma.DeviceOwnershipSelect,
            Prisma.DeviceOwnershipWhereInput
        >,
        @Param('userId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        userId: string,
        @PaginationQueryFilterEqualBoolean('isRevoked')
        isRevoked?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<DeviceOwnershipResponseDto>> {
        return this.deviceService.getListOffsetByAdmin(
            userId,
            pagination,
            isRevoked
        );
    }

    @DeviceAdminRemoveDoc()
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected(
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
    @ActivityLog(EnumActivityLogAction.adminDeviceRemove)
    @Response('device.remove')
    @HttpCode(HttpStatus.OK)
    @Delete('/remove/:deviceOwnershipId')
    async remove(
        @AuthJwtPayload('userId') removedBy: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: UserAgent,
        @RequestGeoLocation() geoLocation: GeoLocation | null,
        @Param('userId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        userId: string,
        @Param(
            'deviceOwnershipId',
            RequestRequiredPipe,
            RequestIsValidObjectIdPipe
        )
        deviceOwnershipId: string
    ): Promise<IResponseReturn<void>> {
        return this.deviceService.removeByAdmin(
            userId,
            deviceOwnershipId,
            {
                ipAddress,
                userAgent,
                geoLocation,
            },
            removedBy
        );
    }
}
