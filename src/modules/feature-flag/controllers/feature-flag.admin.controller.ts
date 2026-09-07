import { PaginationOffsetQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { RequestThrottle } from '@common/request/decorators/request.throttler.decorator';
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
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import {
    FeatureFlagDefaultAvailableOrderBy,
    FeatureFlagDefaultAvailableSearch,
} from '@modules/feature-flag/constants/feature-flag.list.constant';
import {
    FeatureFlagAdminListDoc,
    FeatureFlagAdminUpdateMetadataDoc,
    FeatureFlagAdminUpdateStatusDoc,
} from '@modules/feature-flag/docs/feature-flag.admin.doc';
import {
    FeatureFlagUpdateMetadataRequestDto,
    FeatureFlagUpdateMetadataRequestSchema,
} from '@modules/feature-flag/dtos/request/feature-flag.update-metadata.request.dto';
import {
    FeatureFlagUpdateStatusRequestDto,
    FeatureFlagUpdateStatusRequestSchema,
} from '@modules/feature-flag/dtos/request/feature-flag.update-status.request.dto';
import { FeatureFlagResponseSchema } from '@modules/feature-flag/dtos/response/feature-flag.response.dto';
import { FeatureFlagHttpService } from '@modules/feature-flag/services/feature-flag.http.service';
import { PolicyProtected } from '@modules/policy/decorators/policy.decorator';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Body, Controller, Get, Param, Patch, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
    FeatureFlag,
    Prisma,
} from '@generated/prisma-client';

@ApiTags('modules.admin.featureFlag')
@Controller({
    version: '1',
    path: '/feature-flag',
})
export class FeatureFlagAdminController {
    constructor(
        private readonly featureFlagHttpService: FeatureFlagHttpService
    ) {}

    @FeatureFlagAdminListDoc()
    @ResponsePaging('featureFlag.list', {
        schema: FeatureFlagResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.featureFlag,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/list')
    async list(
        @PaginationOffsetQuery({
            availableSearch: FeatureFlagDefaultAvailableSearch,
            availableOrderBy: FeatureFlagDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.FeatureFlagWhereInput>
    ): Promise<IResponsePagingReturn<FeatureFlag>> {
        return this.featureFlagHttpService.getListByAdmin(pagination);
    }

    @FeatureFlagAdminUpdateStatusDoc()
    @Response('featureFlag.updateStatus', {
        schema: FeatureFlagResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.featureFlag,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Patch('/update/:featureFlagId/status')
    async updateStatus(
        @Param('featureFlagId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        featureFlagId: string,
        @Body({ schema: FeatureFlagUpdateStatusRequestSchema })
        body: FeatureFlagUpdateStatusRequestDto
    ): Promise<IResponseReturn<FeatureFlag>> {
        return this.featureFlagHttpService.updateStatusByAdmin(
            featureFlagId,
            body
        );
    }

    @FeatureFlagAdminUpdateMetadataDoc()
    @Response('featureFlag.updateMetadata', {
        schema: FeatureFlagResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.featureFlag,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Put('/update/:featureFlagId/metadata')
    async update(
        @Param('featureFlagId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        featureFlagId: string,
        @Body({ schema: FeatureFlagUpdateMetadataRequestSchema })
        body: FeatureFlagUpdateMetadataRequestDto
    ): Promise<IResponseReturn<FeatureFlag>> {
        return this.featureFlagHttpService.updateMetadataByAdmin(
            featureFlagId,
            body
        );
    }
}
