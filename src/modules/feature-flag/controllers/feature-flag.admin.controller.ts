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
import { FeatureFlagGetListByAdminUseCase } from '@modules/feature-flag/use-cases/feature-flag.get-list-by-admin.use-case';
import { FeatureFlagUpdateStatusByAdminUseCase } from '@modules/feature-flag/use-cases/feature-flag.update-status-by-admin.use-case';
import { FeatureFlagUpdateMetadataByAdminUseCase } from '@modules/feature-flag/use-cases/feature-flag.update-metadata-by-admin.use-case';
import { FeatureFlagTargetUserRequestSchema } from '@modules/feature-flag/dtos/request/feature-flag.target-user.request.dto';
import type { FeatureFlagTargetUserRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.target-user.request.dto';
import { FeatureFlagAddTargetUserByAdminUseCase } from '@modules/feature-flag/use-cases/feature-flag.add-target-user-by-admin.use-case';
import { FeatureFlagRemoveTargetUserByAdminUseCase } from '@modules/feature-flag/use-cases/feature-flag.remove-target-user-by-admin.use-case';
import { PolicyProtected } from '@modules/policy/decorators/policy.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import {
    Body,
    Controller,
    Delete,
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
} from '@generated/prisma-client/client';
import type { FeatureFlag } from '@generated/prisma-client/client';

@ApiTags('modules.admin.featureFlag')
@Controller({
    version: '1',
    path: '/feature-flag',
})
export class FeatureFlagAdminController {
    constructor(
        private readonly featureFlagGetListByAdminUseCase: FeatureFlagGetListByAdminUseCase,
        private readonly featureFlagUpdateStatusByAdminUseCase: FeatureFlagUpdateStatusByAdminUseCase,
        private readonly featureFlagUpdateMetadataByAdminUseCase: FeatureFlagUpdateMetadataByAdminUseCase,
        private readonly featureFlagAddTargetUserByAdminUseCase: FeatureFlagAddTargetUserByAdminUseCase,
        private readonly featureFlagRemoveTargetUserByAdminUseCase: FeatureFlagRemoveTargetUserByAdminUseCase
    ) {}

    @Doc({ summary: 'admin get all Feature Flags' })
    @ResponsePagination('featureFlag.list', {
        schema: FeatureFlagResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.FeatureFlag,
        action: [EnumPolicyAction.read],
    })
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @Query({ schema: FeatureFlagAdminListRequestSchema })
        query: FeatureFlagAdminListRequestDto
    ): Promise<IResponsePaginationReturn<FeatureFlag>> {
        return this.featureFlagGetListByAdminUseCase.execute(query);
    }

    @Doc({ summary: 'admin update Feature Flag status' })
    @Response('featureFlag.updateStatus', {
        schema: FeatureFlagResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.FeatureFlag,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:featureFlagId/status')
    async updateStatus(
        @Param('featureFlagId', { schema: RequestUuidSchema })
        featureFlagId: string,
        @Body({ schema: FeatureFlagUpdateStatusRequestSchema })
        body: FeatureFlagUpdateStatusRequestDto
    ): Promise<IResponseReturn<FeatureFlag>> {
        return this.featureFlagUpdateStatusByAdminUseCase.execute(
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
        subject: EnumPolicySubject.FeatureFlag,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:featureFlagId/metadata')
    async update(
        @Param('featureFlagId', { schema: RequestUuidSchema })
        featureFlagId: string,
        @Body({ schema: FeatureFlagUpdateMetadataRequestSchema })
        body: FeatureFlagUpdateMetadataRequestDto
    ): Promise<IResponseReturn<FeatureFlag>> {
        return this.featureFlagUpdateMetadataByAdminUseCase.execute(
            featureFlagId,
            body
        );
    }

    @Doc({ summary: 'admin add feature flag target user' })
    @Response('featureFlag.addTargetUser', {
        schema: FeatureFlagResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.FeatureFlag,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/:featureFlagId/user')
    async addTargetUser(
        @Param('featureFlagId', { schema: RequestUuidSchema })
        featureFlagId: string,
        @Body({ schema: FeatureFlagTargetUserRequestSchema })
        body: FeatureFlagTargetUserRequestDto
    ): Promise<IResponseReturn<FeatureFlag>> {
        return this.featureFlagAddTargetUserByAdminUseCase.execute(
            featureFlagId,
            body
        );
    }

    @Doc({ summary: 'admin remove feature flag target user' })
    @Response('featureFlag.removeTargetUser', {
        schema: FeatureFlagResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.FeatureFlag,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/:featureFlagId/user/:userId')
    async removeTargetUser(
        @Param('featureFlagId', { schema: RequestUuidSchema })
        featureFlagId: string,
        @Param('userId', { schema: RequestUuidSchema })
        userId: string
    ): Promise<IResponseReturn<FeatureFlag>> {
        return this.featureFlagRemoveTargetUserByAdminUseCase.execute(
            featureFlagId,
            userId
        );
    }
}
