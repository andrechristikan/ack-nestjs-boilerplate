import { AwsS3PresignResponseSchema } from '@common/aws/dtos/response/aws.s3-presign.response.dto';
import type { IAwsS3Presign } from '@common/aws/interfaces/aws.interface';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    PaginationOffsetQuery,
    PaginationQueryFilterInEnum,
} from '@common/pagination/decorators/pagination.decorator';
import type {
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { RequestMessageLanguageSchema } from '@common/request/validations/request.message-language.validation';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import type {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { PolicyProtected } from '@modules/policy/decorators/policy.decorator';
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
import { TermPolicyContentPresignRequestSchema } from '@modules/term-policy/dtos/request/term-policy.content-presign.request.dto';
import type { TermPolicyContentPresignRequestDto } from '@modules/term-policy/dtos/request/term-policy.content-presign.request.dto';
import { TermPolicyContentRequestSchema } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';
import type { TermPolicyContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';
import { TermPolicyCreateRequestSchema } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import type { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import { TermPolicyRemoveContentRequestSchema } from '@modules/term-policy/dtos/request/term-policy.remove-content.request.dto';
import type { TermPolicyRemoveContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.remove-content.request.dto';
import { TermPolicyResponseSchema } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import { TermPolicyContentHttpService } from '@modules/term-policy/services/term-policy.content.http.service';
import { TermPolicyHttpService } from '@modules/term-policy/services/term-policy.http.service';
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
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
    EnumTermPolicyStatus,
    EnumTermPolicyType,
    Prisma,
} from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';

@ApiTags('modules.admin.termPolicy')
@Controller({
    version: '1',
    path: '/term-policy',
})
export class TermPolicyAdminController {
    constructor(
        private readonly termPolicyHttpService: TermPolicyHttpService,
        private readonly termPolicyContentHttpService: TermPolicyContentHttpService
    ) {}

    @TermPolicyAdminListDoc()
    @ResponsePaging('termPolicy.list', {
        schema: TermPolicyResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.termPolicy,
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
            availableOrderBy: TermPolicyDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.TermPolicyWhereInput>,
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
    ): Promise<IResponsePagingReturn<TermPolicy>> {
        return this.termPolicyHttpService.getListByAdmin(
            pagination,
            type,
            status
        );
    }

    @TermPolicyAdminCreateDoc()
    @Response('termPolicy.create', {
        schema: TermPolicyResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.termPolicy,
        action: [EnumPolicyAction.read, EnumPolicyAction.create],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Post('/create')
    async create(
        @Body({ schema: TermPolicyCreateRequestSchema })
        body: TermPolicyCreateRequestDto
    ): Promise<IResponseReturn<TermPolicy>> {
        return this.termPolicyHttpService.createByAdmin(body);
    }

    @TermPolicyAdminDeleteDoc()
    @Response('termPolicy.delete', {
        schema: TermPolicyResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.termPolicy,
        action: [EnumPolicyAction.read, EnumPolicyAction.delete],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Delete('/delete/:termPolicyId')
    async delete(
        @Param('termPolicyId', { schema: RequestUuidSchema })
        termPolicyId: string
    ): Promise<IResponseReturn<TermPolicy>> {
        return this.termPolicyHttpService.deleteByAdmin(termPolicyId);
    }

    @TermPolicyAdminGenerateContentPresignDoc()
    @Response('termPolicy.generateContentPresign', {
        schema: AwsS3PresignResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
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
    @RequestThrottle({ user: true })
    @HttpCode(HttpStatus.OK)
    @Post('/content/presign/generate')
    async generate(
        @Body({ schema: TermPolicyContentPresignRequestSchema })
        body: TermPolicyContentPresignRequestDto
    ): Promise<IResponseReturn<IAwsS3Presign>> {
        return this.termPolicyContentHttpService.generateContentPresignByAdmin(
            body
        );
    }

    @TermPolicyAdminUpdateContentDoc()
    @Response('termPolicy.updateContent')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.termPolicy,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Put('/content/:termPolicyId/update')
    async updateContent(
        @Param('termPolicyId', { schema: RequestUuidSchema })
        termPolicyId: string,
        @Body({ schema: TermPolicyContentRequestSchema })
        body: TermPolicyContentRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.termPolicyContentHttpService.updateContentByAdmin(
            termPolicyId,
            body
        );
    }

    @TermPolicyAdminAddContentDoc()
    @Response('termPolicy.addContent')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.termPolicy,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Put('/content/:termPolicyId/add')
    async addContent(
        @Param('termPolicyId', { schema: RequestUuidSchema })
        termPolicyId: string,
        @Body({ schema: TermPolicyContentRequestSchema })
        body: TermPolicyContentRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.termPolicyContentHttpService.addContentByAdmin(
            termPolicyId,
            body
        );
    }

    @TermPolicyAdminRemoveContentDoc()
    @Response('termPolicy.removeContent')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.termPolicy,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Delete('/content/:termPolicyId/remove')
    async removeContent(
        @Param('termPolicyId', { schema: RequestUuidSchema })
        termPolicyId: string,
        @Body({ schema: TermPolicyRemoveContentRequestSchema })
        body: TermPolicyRemoveContentRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.termPolicyContentHttpService.removeContentByAdmin(
            termPolicyId,
            body
        );
    }

    @TermPolicyAdminGetContentDoc()
    @Response('termPolicy.getContent', {
        schema: AwsS3PresignResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.termPolicy,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/content/:termPolicyId/:language/get')
    async getContent(
        @Param('termPolicyId', { schema: RequestUuidSchema })
        termPolicyId: string,
        @Param('language', { schema: RequestMessageLanguageSchema })
        language: EnumMessageLanguage
    ): Promise<IResponseReturn<IAwsS3Presign>> {
        return this.termPolicyContentHttpService.getContentByAdmin(
            termPolicyId,
            language
        );
    }

    @TermPolicyAdminPublishDoc()
    @Response('termPolicy.publish')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.termPolicy,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Patch('/publish/:termPolicyId')
    async publish(
        @Param('termPolicyId', { schema: RequestUuidSchema })
        termPolicyId: string,
        @AuthJwtPayload('userId') updatedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.termPolicyHttpService.publishByAdmin(
            termPolicyId,
            updatedBy
        );
    }
}
