import { AwsS3PresignDto } from '@common/aws/dtos/aws.s3-presign.dto';
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
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@modules/policy/enums/policy.enum';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import {
    TERM_POLICY_DEFAULT_AVAILABLE_ORDER_BY,
    TERM_POLICY_DEFAULT_STATUS,
    TERM_POLICY_DEFAULT_TYPE,
} from '@modules/term-policy/constants/term-policy.list.constant';
import {
    TermPolicyAdminAddContentDoc,
    TermPolicyAdminCreateDoc,
    TermPolicyAdminDeleteDoc,
    TermPolicyAdminGenerateContentPresignDoc,
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
    ENUM_ACTIVITY_LOG_ACTION,
    ENUM_ROLE_TYPE,
    ENUM_TERM_POLICY_STATUS,
    ENUM_TERM_POLICY_TYPE,
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
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TERM_POLICY,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @RoleProtected(ENUM_ROLE_TYPE.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationOffsetQuery({
            availableSearch: TERM_POLICY_DEFAULT_AVAILABLE_ORDER_BY,
        })
        pagination: IPaginationQueryOffsetParams,
        @PaginationQueryFilterInEnum<ENUM_TERM_POLICY_TYPE>(
            'type',
            TERM_POLICY_DEFAULT_TYPE
        )
        type?: Record<string, IPaginationIn>,
        @PaginationQueryFilterInEnum<ENUM_TERM_POLICY_STATUS>(
            'status',
            TERM_POLICY_DEFAULT_STATUS
        )
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<TermPolicyResponseDto>> {
        return this.termPolicyService.getList(pagination, type, status);
    }

    @TermPolicyAdminCreateDoc()
    @Response('termPolicy.create')
    @ActivityLog(ENUM_ACTIVITY_LOG_ACTION.adminTermPolicyCreate)
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TERM_POLICY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.CREATE],
    })
    @RoleProtected(ENUM_ROLE_TYPE.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/create')
    async create(
        @Body()
        body: TermPolicyCreateRequestDto,
        @AuthJwtPayload('userId') createdBy: string
    ): Promise<IResponseReturn<TermPolicyResponseDto>> {
        return this.termPolicyService.create(body, createdBy);
    }

    @TermPolicyAdminDeleteDoc()
    @Response('termPolicy.delete')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TERM_POLICY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.DELETE],
    })
    @RoleProtected(ENUM_ROLE_TYPE.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/delete/:termPolicyId')
    async delete(
        @Param('termPolicyId', RequestRequiredPipe)
        termPolicyId: string
    ): Promise<IResponseReturn<TermPolicyResponseDto>> {
        return this.termPolicyService.delete(termPolicyId);
    }

    @TermPolicyAdminGenerateContentPresignDoc()
    @Response('termPolicy.generateContentPresign')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TERM_POLICY,
        action: [
            ENUM_POLICY_ACTION.READ,
            ENUM_POLICY_ACTION.CREATE,
            ENUM_POLICY_ACTION.UPDATE,
        ],
    })
    @RoleProtected(ENUM_ROLE_TYPE.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/generate/content/presign')
    async generate(
        @Body() body: TermPolicyContentPresignRequestDto
    ): Promise<IResponseReturn<AwsS3PresignDto>> {
        return this.termPolicyService.generateContentPresign(body);
    }

    @TermPolicyAdminUpdateContentDoc()
    @Response('termPolicy.updateContent')
    @ActivityLog(ENUM_ACTIVITY_LOG_ACTION.adminTermPolicyUpdateContent)
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TERM_POLICY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @RoleProtected(ENUM_ROLE_TYPE.admin)
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
        return this.termPolicyService.updateContent(
            termPolicyId,
            body,
            updatedBy
        );
    }

    @TermPolicyAdminAddContentDoc()
    @Response('termPolicy.addContent')
    @ActivityLog(ENUM_ACTIVITY_LOG_ACTION.adminTermPolicyAddContent)
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TERM_POLICY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @RoleProtected(ENUM_ROLE_TYPE.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/update/:termPolicyId/content/add')
    async addContent(
        @Param('termPolicyId', RequestRequiredPipe)
        termPolicyId: string,
        @Body()
        body: TermPolicyContentRequestDto,
        @AuthJwtPayload('userId') updatedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.termPolicyService.addContent(termPolicyId, body, updatedBy);
    }

    @TermPolicyAdminRemoveContentDoc()
    @Response('termPolicy.removeContent')
    @ActivityLog(ENUM_ACTIVITY_LOG_ACTION.adminTermPolicyRemoveContent)
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TERM_POLICY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @RoleProtected(ENUM_ROLE_TYPE.admin)
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
        return this.termPolicyService.removeContent(
            termPolicyId,
            body,
            updatedBy
        );
    }

    @TermPolicyAdminPublishDoc()
    @Response('termPolicy.publish')
    @ActivityLog(ENUM_ACTIVITY_LOG_ACTION.adminTermPolicyPublish)
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TERM_POLICY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @RoleProtected(ENUM_ROLE_TYPE.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/publish/:termPolicyId')
    async publish(
        @Param('termPolicyId', RequestRequiredPipe)
        termPolicyId: string,
        @AuthJwtPayload('userId') updatedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.termPolicyService.publish(termPolicyId, updatedBy);
    }
}
