import type { FeatureFlagAdminListRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.admin-list.request.dto';
import { FeatureFlagAdminListRequestSchema } from '@modules/feature-flag/dtos/request/feature-flag.admin-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
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

import { FeatureFlagUpdateMetadataRequestSchema } from '@modules/feature-flag/dtos/request/feature-flag.update-metadata.request.dto';
import type { FeatureFlagUpdateMetadataRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-metadata.request.dto';
import { FeatureFlagUpdateStatusRequestSchema } from '@modules/feature-flag/dtos/request/feature-flag.update-status.request.dto';
import type { FeatureFlagUpdateStatusRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-status.request.dto';
import { FeatureFlagResponseSchema } from '@modules/feature-flag/dtos/response/feature-flag.response.dto';
import { FeatureFlagHttpService } from '@modules/feature-flag/services/feature-flag.http.service';
import { PolicyProtected } from '@modules/policy/decorators/policy.decorator';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Put,
    Query,
} from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
} from '@generated/prisma-client/client';

import type { FeatureFlag } from '@generated/prisma-client/client';

@ApiTags('modules.admin.featureFlag')
@Controller({
    version: '1',
    path: '/feature-flag',
})
export class FeatureFlagAdminController {
    constructor(
        private readonly featureFlagHttpService: FeatureFlagHttpService
    ) {}

    @Doc({ summary: 'admin get all Feature Flags' })
    @ResponsePagination('featureFlag.list', {
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
        @Query({ schema: FeatureFlagAdminListRequestSchema })
        query: FeatureFlagAdminListRequestDto
    ): Promise<IResponsePaginationReturn<FeatureFlag>> {
        return this.featureFlagHttpService.getListByAdmin(query);
    }

    @Doc({ summary: 'admin update Feature Flag status' })
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
        @Param('featureFlagId', { schema: RequestUuidSchema })
        featureFlagId: string,
        @Body({ schema: FeatureFlagUpdateStatusRequestSchema })
        body: FeatureFlagUpdateStatusRequestDto
    ): Promise<IResponseReturn<FeatureFlag>> {
        return this.featureFlagHttpService.updateStatusByAdmin(
            featureFlagId,
            body
        );
    }

    @Doc({ summary: 'admin update Feature Flag metadata' })
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
        @Param('featureFlagId', { schema: RequestUuidSchema })
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
