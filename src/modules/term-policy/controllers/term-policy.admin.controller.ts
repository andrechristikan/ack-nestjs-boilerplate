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
    Prisma,
} from '@generated/prisma-client';

@ApiTags('modules.admin.termPolicy')
@Controller({
    version: '1',
    path: '/term-policy',
})
export class TermPolicyAdminController {
    constructor(private readonly termPolicyService: TermPolicyService) {}

    @TermPolicyAdminListDoc()
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.termPolicy,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @ResponsePaging('termPolicy.list')
    @Get('/list')
    async list(
        @PaginationOffsetQuery({
            availableOrderBy: TermPolicyDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<
            Prisma.TermPolicySelect,
            Prisma.TermPolicyWhereInput
        >,
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
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.termPolicy,
        action: [EnumPolicyAction.read, EnumPolicyAction.create],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @ActivityLog(EnumActivityLogAction.adminTermPolicyCreate)
    @Response('termPolicy.create')
    @Post('/create')
    async create(
        @Body()
        body: TermPolicyCreateRequestDto,
        @AuthJwtPayload('userId') createdBy: string
    ): Promise<IResponseReturn<TermPolicyResponseDto>> {
        return this.termPolicyService.createByAdmin(body, createdBy);
    }

    @TermPolicyAdminDeleteDoc()
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.termPolicy,
        action: [EnumPolicyAction.read, EnumPolicyAction.delete],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @ActivityLog(EnumActivityLogAction.adminTermPolicyDelete)
    @Response('termPolicy.delete')
    @Delete('/delete/:termPolicyId')
    async delete(
        @Param('termPolicyId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        termPolicyId: string
    ): Promise<IResponseReturn<TermPolicyResponseDto>> {
        return this.termPolicyService.deleteByAdmin(termPolicyId);
    }

    @TermPolicyAdminGenerateContentPresignDoc()
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
    @Response('termPolicy.generateContentPresign')
    @HttpCode(HttpStatus.OK)
    @Post('/generate/content/presign')
    async generate(
        @Body() body: TermPolicyContentPresignRequestDto
    ): Promise<IResponseReturn<AwsS3PresignDto>> {
        return this.termPolicyService.generateContentPresignByAdmin(body);
    }

    @TermPolicyAdminUpdateContentDoc()
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.termPolicy,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @ActivityLog(EnumActivityLogAction.adminTermPolicyUpdateContent)
    @Response('termPolicy.updateContent')
    @Put('/update/:termPolicyId/content/update')
    async updateContent(
        @Param('termPolicyId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
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
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.termPolicy,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @ActivityLog(EnumActivityLogAction.adminTermPolicyAddContent)
    @Response('termPolicy.addContent')
    @Put('/update/:termPolicyId/content/add')
    async addContent(
        @Param('termPolicyId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
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
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.termPolicy,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @ActivityLog(EnumActivityLogAction.adminTermPolicyRemoveContent)
    @Response('termPolicy.removeContent')
    @Delete('/update/:termPolicyId/content/remove')
    async removeContent(
        @Param('termPolicyId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
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
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.termPolicy,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Response('termPolicy.getContent')
    @HttpCode(HttpStatus.OK)
    @Post('/get/:termPolicyId/content/:language')
    async getContent(
        @Param('termPolicyId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        termPolicyId: string,
        @Param('language', RequestRequiredPipe) language: EnumMessageLanguage
    ): Promise<IResponseReturn<AwsS3PresignDto>> {
        return this.termPolicyService.getContentByAdmin(termPolicyId, language);
    }

    @TermPolicyAdminPublishDoc()
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.termPolicy,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @ActivityLog(EnumActivityLogAction.adminTermPolicyPublish)
    @Response('termPolicy.publish')
    @Patch('/publish/:termPolicyId')
    async publish(
        @Param('termPolicyId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        termPolicyId: string,
        @AuthJwtPayload('userId') updatedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.termPolicyService.publishByAdmin(termPolicyId, updatedBy);
    }
}
