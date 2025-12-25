import { PaginationOffsetQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
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
import { FeatureFlagDefaultAvailableSearch } from '@modules/feature-flag/constants/feature-flag.list.constant';
import {
    FeatureFlagAdminListDoc,
    FeatureFlagAdminUpdateMetadataDoc,
    FeatureFlagAdminUpdateStatusDoc,
} from '@modules/feature-flag/docs/feature-flag.admin.doc';
import { FeatureFlagUpdateMetadataRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-metadata.request';
import { FeatureFlagUpdateStatusRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-status.request';
import { FeatureFlagResponseDto } from '@modules/feature-flag/dtos/response/feature-flag.response';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { PolicyAbilityProtected } from '@modules/policy/decorators/policy.decorator';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Body, Controller, Get, Param, Patch, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EnumRoleType } from '@prisma/client';

@ApiTags('common.admin.featureFlag')
@Controller({
    version: '1',
    path: '/feature-flag',
})
export class FeatureFlagAdminController {
    constructor(private readonly featureFlagService: FeatureFlagService) {}

    @FeatureFlagAdminListDoc()
    @ResponsePaging('featureFlag.list')
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.featureFlag,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationOffsetQuery({
            availableSearch: FeatureFlagDefaultAvailableSearch,
        })
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<FeatureFlagResponseDto>> {
        return this.featureFlagService.getListByAdmin(pagination);
    }

    @FeatureFlagAdminUpdateStatusDoc()
    @Response('featureFlag.updateStatus')
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.featureFlag,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:featureFlagId/status')
    async updateStatus(
        @Param('featureFlagId', RequestRequiredPipe)
        featureFlagId: string,
        @Body() body: FeatureFlagUpdateStatusRequestDto
    ): Promise<IResponseReturn<FeatureFlagResponseDto>> {
        return this.featureFlagService.updateStatusByAdmin(featureFlagId, body);
    }

    @FeatureFlagAdminUpdateMetadataDoc()
    @Response('featureFlag.updateMetadata')
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.featureFlag,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:featureFlagId/metadata')
    async update(
        @Param('featureFlagId', RequestRequiredPipe)
        featureFlagId: string,
        @Body() body: FeatureFlagUpdateMetadataRequestDto
    ): Promise<IResponseReturn<FeatureFlagResponseDto>> {
        return this.featureFlagService.updateMetadataByAdmin(
            featureFlagId,
            body
        );
    }
}
