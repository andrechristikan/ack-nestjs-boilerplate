import { ApiTags } from '@nestjs/swagger';
import {
    BadRequestException,
    Body,
    ConflictException,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    InternalServerErrorException,
    NotFoundException,
    Param,
    Post,
    Put,
} from '@nestjs/common';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from '@common/response/interfaces/response.interface';
import { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import { PaginationQuery } from '@common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from '@common/pagination/dtos/pagination.list.dto';
import { TermPolicyGetResponseDto } from '@modules/term-policy/dtos/response/term-policy.get.response.dto';
import { ENUM_TERM_POLICY_STATUS_CODE_ERROR } from '@modules/term-policy/enums/term-policy.status-code.enum';
import { TermPolicyListResponseDto } from '@modules/term-policy/dtos/response/term-policy.list.response.dto';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from '@modules/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '@modules/policy/enums/policy.enum';
import {
    TermPolicyAuthGetDoc,
    TermPolicyAuthListDoc,
    TermPolicyAuthUpdateDoc,
} from '@modules/term-policy/docs/term-policy.auth.doc';
import { TermPolicyAdminCreateDoc } from '@modules/term-policy/docs/term-policy.admin.doc';
import { UserParsePipe } from '@modules/user/pipes/user.parse.pipe';
import { UserDoc } from '@modules/user/repository/entities/user.entity';
import { TermPolicyUpdateRequestDto } from '@modules/term-policy/dtos/request/term-policy.update.request.dto';
import { AwsS3PresignResponseDto } from '@modules/aws/dtos/response/aws.s3-presign.response.dto';
import { AwsS3Service } from '@modules/aws/services/aws.s3.service';
import { DatabaseService } from '@common/database/services/database.service';
import { ClientSession } from 'mongoose';
import { ENUM_APP_STATUS_CODE_ERROR } from '@app/enums/app.status-code.enum';
import { TermPolicyUploadDocumentRequestDto } from '@modules/term-policy/dtos/request/term-policy.upload-document.request';
import { AwsS3Dto } from '@modules/aws/dtos/aws.s3.dto';
import { TermPolicyUpdateDocumentRequestDto } from '@modules/term-policy/dtos/request/term-policy.update-document.request';
import { ActivityService } from '@modules/activity/services/activity.service';
import { MessageService } from '@common/message/services/message.service';
import { ENUM_AWS_S3_ACCESSIBILITY } from '@modules/aws/enums/aws.enum';

@ApiTags('modules.admin.term-policy')
@Controller({
    version: '1',
    path: '/term-policy',
})
export class TermPolicyAdminController {
    constructor(
        private readonly termPolicyService: TermPolicyService,
        private readonly helperDateService: HelperDateService,
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService,
        private readonly awsS3Service: AwsS3Service,
        private readonly messageService: MessageService,
        private readonly databaseService: DatabaseService
    ) {}

    @TermPolicyAuthListDoc()
    @ResponsePaging('termPolicy.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TERM,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @Get('/')
    async list(
        @PaginationQuery()
        { _search, _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging<TermPolicyListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
        };

        const [terms, total] = await Promise.all([
            this.termPolicyService.findAll(find, {
                paging: {
                    limit: _limit,
                    offset: _offset,
                },
                order: _order,
            }),
            this.termPolicyService.getTotal(find),
        ]);

        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        const mapped = this.termPolicyService.mapList(terms);

        return {
            _pagination: { total, totalPage },
            data: mapped,
        };
    }

    @TermPolicyAuthGetDoc()
    @UserProtected()
    @AuthJwtAccessProtected()
    @Response('termPolicy.get')
    @Get('/:id')
    async get(
        @Param('id') id: string
    ): Promise<IResponse<TermPolicyGetResponseDto>> {
        const termPolicy = await this.termPolicyService.findOneById(id);

        if (!termPolicy) {
            throw new NotFoundException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'termPolicy.error.notFound',
            });
        }

        const mapped = this.termPolicyService.mapGet(termPolicy);
        return {
            data: mapped,
        };
    }

    @TermPolicyAdminCreateDoc()
    @Response('termPolicy.create')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TERM,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @Post('/')
    async create(
        @Body() dto: TermPolicyCreateRequestDto
    ): Promise<IResponse<TermPolicyGetResponseDto>> {
        const exist = await this.termPolicyService.findOne({
            language: dto.language,
            country: dto.country,
            version: dto.version,
            type: dto.type,
        });
        if (exist) {
            throw new ConflictException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.EXIST,
                message: 'termPolicy.error.exist',
            });
        }
        const termPolicy = await this.termPolicyService.create(dto);
        const mapped = this.termPolicyService.mapGet(termPolicy);
        return {
            data: mapped,
        };
    }


    @Response('termPolicy.updateDocument')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TERM,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @Put('/update-document')
    async updateDocument(
        @Body() dto: TermPolicyUpdateDocumentRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserDoc
    ): Promise<IResponse<TermPolicyGetResponseDto>> {
        // Check if term policy already exists
        const exist = await this.termPolicyService.findOne({
            type: dto.type,
            country: dto.country,
            language: dto.language,
        });

        if (exist) {
            throw new NotFoundException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.EXIST,
                message: 'termPolicy.error.exist',
            });
        }

        const session: ClientSession =
            await this.databaseService.createTransaction();

        try {
            const aws: AwsS3Dto = this.awsS3Service.mapPresign(dto);

            // Create term policy record in MongoDB
            const termPolicy = await this.termPolicyService.create(
                {
                    title: dto.title,
                    description: dto.description,
                    documentUrl: aws.completedUrl,
                    version: dto.version,
                    country: dto.country,
                    language: dto.language,
                    type: dto.type,
                    publishedAt: dto.publishedAt || new Date(),
                },
                { session }
            );
            await this.activityService.createByUser(
                user,
                {
                    description:
                        this.messageService.setMessage('termPolicy.update'),
                },
                { session }
            );

            await this.databaseService.commitTransaction(session);

            const mapped = this.termPolicyService.mapGet(termPolicy);

            return {
                data: mapped,
            };
        } catch (err: unknown) {
            await this.databaseService.abortTransaction(session);

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    @TermPolicyAuthUpdateDoc()
    @Response('termPolicy.update')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TERM,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @Put('/:id')
    async update(
        @Param('id') id: string,
        @Body() dto: TermPolicyUpdateRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserDoc
    ): Promise<IResponse<TermPolicyGetResponseDto>> {
        const termPolicy = await this.termPolicyService.findOneById(id);

        if (!termPolicy) {
            throw new NotFoundException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'termPolicy.error.notFound',
            });
        }

        const isPublished =
            !!termPolicy.publishedAt &&
            termPolicy.publishedAt < this.helperDateService.create();
        if (isPublished) {
            throw new BadRequestException({
                statusCode:
                    ENUM_TERM_POLICY_STATUS_CODE_ERROR.UPDATE_FORBIDDEN_STATUS_PUBLISHED,
                message: 'termPolicy.error.updateForbiddenStatusPublished',
            });
        }

        Object.assign(termPolicy, dto);

        const updatedTermPolicy = await this.termPolicyService.update(
            termPolicy,
            { actionBy: user.id }
        );
        const mapped = this.termPolicyService.mapGet(updatedTermPolicy);

        return {
            data: mapped,
        };
    }

    @Response('termPolicy.uploadDocument')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TERM,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/upload-document')
    async uploadDocument(
        @Body() dto: TermPolicyUploadDocumentRequestDto
    ): Promise<IResponse<AwsS3PresignResponseDto>> {
        // Check if term policy already exists
        const exist = await this.termPolicyService.findOne({
            language: dto.language,
            country: dto.country,
            version: dto.version,
            type: dto.type,
        });
        if (exist) {
            throw new ConflictException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.EXIST,
                message: 'termPolicy.error.exist',
            });
        }

        const filename = this.termPolicyService.createDocumentFilename(
            dto.type,
            dto.country,
            dto.language,
            'html'
        );

        const presignUrl = await this.awsS3Service.presignPutItem(
            filename,
            dto.size,
            { access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE }
        );

        return {
            data: presignUrl,
        };
    }

}
