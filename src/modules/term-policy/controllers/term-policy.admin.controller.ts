import { AwsS3PresignDto } from '@common/aws/dtos/aws.s3-presign.dto';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    PaginationOffsetQuery,
    PaginationQueryFilterInEnum,
} from '@common/pagination/decorators/pagination.decorator';
import {
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { ActivityLog } from '@modules/activity-log/decorators/activity-log.decorator';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { PolicyAbilityProtected } from '@modules/policy/decorators/policy.decorator';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import {
    TermPolicyDefaultAvailableOrderBy,
    TermPolicyDefaultStatus,
    TermPolicyDefaultType,
} from '@modules/term-policy/constants/term-policy.list.constant';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import {
    TermPolicyAdminAddContentDoc,
    TermPolicyAdminCreateDoc,
    TermPolicyAdminDeleteDoc,
    TermPolicyAdminGenerateContentPresignDoc,
    TermPolicyAdminGetContentDoc,
    TermPolicyAdminListDoc,
    TermPolicyAdminPublishDoc,
    TermPolicyAdminRemoveContentDoc,
    TermPolicyAdminUpdateContentDoc,
} from '@modules/term-policy/docs/term-policy.admin.doc';
import { TermPolicyContentPresignRequestDto } from '@modules/term-policy/dtos/request/term-policy.content-presign.request.dto';
import { TermPolicyContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';
import { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import { TermPolicyRemoveContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.remove-content.request.dto';
import { TermPolicyResponseDto } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@prisma/client';

@ApiTags('modules.admin.termPolicy')
@Controller({
    version: '1',
    path: '/term-policy',
})
export class TermPolicyAdminController {
    constructor(private readonly termPolicyService: TermPolicyService) {}

    @TermPolicyAdminListDoc()
    @ResponsePaging('termPolicy.list')
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.termPolicy,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationOffsetQuery({
            availableSearch: TermPolicyDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams,
        @PaginationQueryFilterInEnum<EnumTermPolicyType>(
            'type',
            TermPolicyDefaultType
        )
        type?: Record<string, IPaginationIn>,
        @PaginationQueryFilterInEnum<EnumTermPolicyStatus>(
            'status',
            TermPolicyDefaultStatus
        )
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<TermPolicyResponseDto>> {
        return this.termPolicyService.getListByAdmin(pagination, type, status);
    }

    @TermPolicyAdminCreateDoc()
    @Response('termPolicy.create')
    @ActivityLog(EnumActivityLogAction.adminTermPolicyCreate)
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.termPolicy,
        action: [EnumPolicyAction.read, EnumPolicyAction.create],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/create')
    async create(
        @Body()
        body: TermPolicyCreateRequestDto,
        @AuthJwtPayload('userId') createdBy: string
    ): Promise<IResponseReturn<TermPolicyResponseDto>> {
        return this.termPolicyService.createByAdmin(body, createdBy);
    }

    @TermPolicyAdminDeleteDoc()
    @Response('termPolicy.delete')
    @ActivityLog(EnumActivityLogAction.adminTermPolicyDelete)
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.termPolicy,
        action: [EnumPolicyAction.read, EnumPolicyAction.delete],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/delete/:termPolicyId')
    async delete(
        @Param('termPolicyId', RequestRequiredPipe)
        termPolicyId: string
    ): Promise<IResponseReturn<TermPolicyResponseDto>> {
        return this.termPolicyService.deleteByAdmin(termPolicyId);
    }

    @TermPolicyAdminGenerateContentPresignDoc()
    @Response('termPolicy.generateContentPresign')
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.termPolicy,
        action: [
            EnumPolicyAction.read,
            EnumPolicyAction.create,
            EnumPolicyAction.update,
        ],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/generate/content/presign')
    async generate(
        @Body() body: TermPolicyContentPresignRequestDto
    ): Promise<IResponseReturn<AwsS3PresignDto>> {
        return this.termPolicyService.generateContentPresignByAdmin(body);
    }

    @TermPolicyAdminUpdateContentDoc()
    @Response('termPolicy.updateContent')
    @ActivityLog(EnumActivityLogAction.adminTermPolicyUpdateContent)
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.termPolicy,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:termPolicyId/content/update')
    async updateContent(
        @Param('termPolicyId', RequestRequiredPipe)
        termPolicyId: string,
        @Body()
        body: TermPolicyContentRequestDto,
        @AuthJwtPayload('userId') updatedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.termPolicyService.updateContentByAdmin(
            termPolicyId,
            body,
            updatedBy
        );
    }

    @TermPolicyAdminAddContentDoc()
    @Response('termPolicy.addContent')
    @ActivityLog(EnumActivityLogAction.adminTermPolicyAddContent)
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.termPolicy,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:termPolicyId/content/add')
    async addContent(
        @Param('termPolicyId', RequestRequiredPipe)
        termPolicyId: string,
        @Body()
        body: TermPolicyContentRequestDto,
        @AuthJwtPayload('userId') updatedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.termPolicyService.addContentByAdmin(
            termPolicyId,
            body,
            updatedBy
        );
    }

    @TermPolicyAdminRemoveContentDoc()
    @Response('termPolicy.removeContent')
    @ActivityLog(EnumActivityLogAction.adminTermPolicyRemoveContent)
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.termPolicy,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/update/:termPolicyId/content/remove')
    async removeContent(
        @Param('termPolicyId', RequestRequiredPipe)
        termPolicyId: string,
        @Body()
        body: TermPolicyRemoveContentRequestDto,
        @AuthJwtPayload('userId') updatedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.termPolicyService.removeContentByAdmin(
            termPolicyId,
            body,
            updatedBy
        );
    }

    @TermPolicyAdminGetContentDoc()
    @Response('termPolicy.getContent')
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.termPolicy,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/get/:termPolicyId/content/:language')
    async getContent(
        @Param('termPolicyId', RequestRequiredPipe)
        termPolicyId: string,
        @Param('language', RequestRequiredPipe) language: EnumMessageLanguage
    ): Promise<IResponseReturn<AwsS3PresignDto>> {
        return this.termPolicyService.getContentByAdmin(termPolicyId, language);
    }

    @TermPolicyAdminPublishDoc()
    @Response('termPolicy.publish')
    @ActivityLog(EnumActivityLogAction.adminTermPolicyPublish)
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.termPolicy,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/publish/:termPolicyId')
    async publish(
        @Param('termPolicyId', RequestRequiredPipe)
        termPolicyId: string,
        @AuthJwtPayload('userId') updatedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.termPolicyService.publishByAdmin(termPolicyId, updatedBy);
    }
}
