import { ApiTags } from '@nestjs/swagger';
import {
    Body,
    ConflictException,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    InternalServerErrorException,
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
import {
    PaginationQuery,
    PaginationQueryFilterEqual,
    PaginationQueryFilterInEnum,
} from '@common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from '@common/pagination/dtos/pagination.list.dto';
import { PaginationService } from '@common/pagination/services/pagination.service';
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
    TermPolicyAdminCreateDoc,
    TermPolicyAdminDeleteDoc,
    TermPolicyAdminListDoc,
    TermPolicyAdminUpdateDocumentDoc,
    TermPolicyAdminUploadDocumentDoc,
} from '@modules/term-policy/docs/term-policy.admin.doc';
import { AwsS3Service } from '@modules/aws/services/aws.s3.service';
import { DatabaseService } from '@common/database/services/database.service';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { TermPolicyResponseDto } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import {
    TERM_POLICY_DEFAULT_AVAILABLE_ORDER_BY,
    TERM_POLICY_DEFAULT_STATUS,
} from '@modules/term-policy/constants/term-policy.list.constant';
import { ENUM_TERM_POLICY_STATUS } from '@modules/term-policy/enums/term-policy.enum';
import { AwsS3PresignResponseDto } from '@modules/aws/dtos/response/aws.s3-presign.response.dto';
import { TermPolicyUploadDocumentRequestDto } from '@modules/term-policy/dtos/request/term-policy.upload-document.request';
import { ENUM_AWS_S3_ACCESSIBILITY } from '@modules/aws/enums/aws.enum';
import { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import { ENUM_TERM_POLICY_STATUS_CODE_ERROR } from '@modules/term-policy/enums/term-policy.status-code.enum';
import { ClientSession } from 'mongoose';
import { AwsS3Dto } from '@modules/aws/dtos/aws.s3.dto';
import { TermPolicyUpdateDocumentRequestDto } from '@modules/term-policy/dtos/request/term-policy.update-document.request';
import { UserService } from '@modules/user/services/user.service';
import { DatabaseIdResponseDto } from '@common/database/dtos/response/database.id.response.dto';
import { ENUM_APP_STATUS_CODE_ERROR } from '@app/enums/app.status-code.enum';
import { TermPolicyParsePipe } from '@modules/term-policy/pipes/term-policy.parse.pipe';
import { TermPolicyDoc } from '@modules/term-policy/repository/entities/term-policy.entity';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import { TermPolicyStatusPipe } from '@modules/term-policy/pipes/term-policy.status.pipe';

@ApiTags('modules.admin.term-policy')
@Controller({
    version: '1',
    path: '/term-policy',
})
export class TermPolicyAdminController {
    constructor(
        private readonly termPolicyService: TermPolicyService,
        private readonly paginationService: PaginationService,
        private readonly awsS3Service: AwsS3Service,
        private readonly databaseService: DatabaseService,
        private readonly userService: UserService
    ) {}

    @TermPolicyAdminListDoc()
    @ResponsePaging('termPolicy.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TERM_POLICY,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationQuery({
            availableOrderBy: TERM_POLICY_DEFAULT_AVAILABLE_ORDER_BY,
        })
        { _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterEqual('country')
        country: Record<string, any>,
        @PaginationQueryFilterInEnum(
            'type',
            TERM_POLICY_DEFAULT_STATUS,
            ENUM_TERM_POLICY_STATUS
        )
        type: Record<string, any>
    ): Promise<IResponsePaging<TermPolicyResponseDto>> {
        const find: Record<string, any> = {
            ...country,
            ...type,
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

    @TermPolicyAdminUploadDocumentDoc()
    @Response('termPolicy.uploadDocument')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TERM_POLICY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/upload/document')
    async uploadDocument(
        @Body()
        { mime, size }: TermPolicyUploadDocumentRequestDto
    ): Promise<IResponse<AwsS3PresignResponseDto>> {
        const filename = this.termPolicyService.createDocumentFilename(mime);

        const aws = await this.awsS3Service.presignPutItem(filename, size, {
            access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE,
            forceUpdate: true,
        });

        return {
            data: aws,
        };
    }

    @TermPolicyAdminCreateDoc()
    @Response('termPolicy.create')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TERM_POLICY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.CREATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/create')
    async create(
        @Body()
        { country, type, urls }: TermPolicyCreateRequestDto,
        @AuthJwtPayload('user') createdBy: string
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const exist = await this.termPolicyService.findOneLatest(type, country);
        if (exist && exist.status === ENUM_TERM_POLICY_STATUS.DRAFT) {
            throw new ConflictException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.EXIST,
                message: 'termPolicy.error.exist',
            });
        }

        const session: ClientSession =
            await this.databaseService.createTransaction();

        try {
            const mapUrls: (AwsS3Dto & TermPolicyUpdateDocumentRequestDto)[] =
                urls.map(({ key, size, language }) => ({
                    ...this.awsS3Service.mapPresign({
                        key,
                        size,
                    }),
                    language,
                }));

            const termPolicy = await this.termPolicyService.create(
                exist,
                mapUrls,
                createdBy,
                {
                    session,
                }
            );
            await this.userService.releaseTermPolicy(type, { session });

            await this.databaseService.commitTransaction(session);

            return {
                data: { _id: termPolicy._id },
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

    @TermPolicyAdminUpdateDocumentDoc()
    @Response('termPolicy.updateDocument')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TERM_POLICY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:termPolicy/document')
    async updateDocument(
        @Param('termPolicy', RequestRequiredPipe, TermPolicyParsePipe)
        termPolicy: TermPolicyDoc,
        @Body()
        { key, language, size }: TermPolicyUpdateDocumentRequestDto
    ): Promise<void> {
        const session: ClientSession =
            await this.databaseService.createTransaction();

        try {
            const url = this.awsS3Service.mapPresign({
                key,
                size,
            });

            await this.termPolicyService.updateDocument(
                termPolicy,
                language,
                url
            );

            if (termPolicy.status === ENUM_TERM_POLICY_STATUS.PUBLISHED) {
                await this.userService.releaseTermPolicy(termPolicy.type);
            }

            await this.databaseService.commitTransaction(session);

            return;
        } catch (err: unknown) {
            await this.databaseService.abortTransaction(session);

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    @TermPolicyAdminDeleteDoc()
    @Response('termPolicy.deleteDocument')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TERM_POLICY,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.DELETE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/delete/:termPolicy')
    async delete(
        @Param(
            'termPolicy',
            RequestRequiredPipe,
            TermPolicyParsePipe,
            new TermPolicyStatusPipe([ENUM_TERM_POLICY_STATUS.DRAFT])
        )
        termPolicy: TermPolicyDoc
    ): Promise<void> {
        await this.termPolicyService.delete(termPolicy);

        return;
    }
}
