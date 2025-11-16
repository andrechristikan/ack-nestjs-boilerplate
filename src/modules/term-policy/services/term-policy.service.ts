import { ENUM_APP_STATUS_CODE_ERROR } from '@app/enums/app.status-code.enum';
import { AwsS3PresignDto } from '@common/aws/dtos/aws.s3-presign.dto';
import { ENUM_AWS_S3_ACCESSIBILITY } from '@common/aws/enums/aws.enum';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { ENUM_FILE_EXTENSION_DOCUMENT } from '@common/file/enums/file.enum';
import {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IRequestApp,
    IRequestLog,
} from '@common/request/interfaces/request.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { ENUM_AUTH_STATUS_CODE_ERROR } from '@modules/auth/enums/auth.status-code.enum';
import { TermPolicyAcceptRequestDto } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import { TermPolicyContentPresignRequestDto } from '@modules/term-policy/dtos/request/term-policy.content-presign.request.dto';
import { TermPolicyContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';
import { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import { TermPolicyRemoveContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.remove-content.request.dto';
import { TermPolicyResponseDto } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import { TermPolicyUserAcceptanceResponseDto } from '@modules/term-policy/dtos/response/term-policy.user-acceptance.response.dto';
import { TermContentDto } from '@modules/term-policy/dtos/term-policy.content.dto';
import { ENUM_TERM_POLICY_STATUS_CODE_ERROR } from '@modules/term-policy/enums/term-policy.status-code.enum';
import { ITermPolicyService } from '@modules/term-policy/interfaces/term-policy.service.interface';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { UserTermPolicyDto } from '@modules/user/dtos/user.term-policy.dto';
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { ENUM_TERM_POLICY_STATUS, ENUM_TERM_POLICY_TYPE } from '@prisma/client';

@Injectable()
export class TermPolicyService implements ITermPolicyService {
    constructor(
        private readonly termPolicyRepository: TermPolicyRepository,
        private readonly termPolicyUtil: TermPolicyUtil,
        private readonly awsS3Service: AwsS3Service
    ) {}

    async validateTermPolicyGuard(
        request: IRequestApp,
        requiredTermPolicies: ENUM_TERM_POLICY_TYPE[]
    ): Promise<void> {
        const { __user, user } = request;
        if (!__user || !user) {
            throw new ForbiddenException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        try {
            const { termPolicy } = __user;

            const defaultTermPolicies = [
                ENUM_TERM_POLICY_TYPE.termsOfService,
                ENUM_TERM_POLICY_TYPE.privacy,
            ];
            requiredTermPolicies =
                requiredTermPolicies.length === 0
                    ? defaultTermPolicies
                    : requiredTermPolicies;

            const termPolicyObj = JSON.parse(
                (termPolicy as string) ?? '{}'
            ) as UserTermPolicyDto;
            if (!requiredTermPolicies.every(type => termPolicyObj[type])) {
                throw new ForbiddenException({
                    statusCode:
                        ENUM_TERM_POLICY_STATUS_CODE_ERROR.REQUIRED_INVALID,
                    message: 'termPolicy.error.requiredInvalid',
                });
            }
        } catch {
            throw new ForbiddenException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }
    }

    async getList(
        pagination: IPaginationQueryOffsetParams,
        type?: Record<string, IPaginationIn>,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<TermPolicyResponseDto>> {
        const { data, ...others } = await this.termPolicyRepository.find(
            pagination,
            type,
            status
        );

        const termPolicies: TermPolicyResponseDto[] =
            this.termPolicyUtil.mapList(data);

        return {
            data: termPolicies,
            ...others,
        };
    }

    async getListPublished(
        pagination: IPaginationQueryCursorParams,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<TermPolicyResponseDto>> {
        const { data, ...others } =
            await this.termPolicyRepository.findPublished(pagination, type);

        const termPolicies: TermPolicyResponseDto[] =
            this.termPolicyUtil.mapList(data);

        return {
            data: termPolicies,
            ...others,
        };
    }

    async getListUserAccepted(
        userId: string,
        pagination: IPaginationQueryCursorParams
    ): Promise<IResponsePagingReturn<TermPolicyUserAcceptanceResponseDto>> {
        const { data, ...others } =
            await this.termPolicyRepository.findUserAccepted(
                userId,
                pagination
            );

        const termPolicies: TermPolicyUserAcceptanceResponseDto[] =
            this.termPolicyUtil.mapListUserAccepted(data);

        return {
            data: termPolicies,
            ...others,
        };
    }

    async userAccept(
        userId: string,
        { type }: TermPolicyAcceptRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        const policy =
            await this.termPolicyRepository.existLatestPublishedByType(type);
        if (!policy) {
            throw new NotFoundException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'termPolicy.error.notFound',
            });
        }

        const exist =
            await this.termPolicyRepository.existAcceptanceByPolicyAndUser(
                userId,
                type
            );
        if (exist) {
            throw new ConflictException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.ALREADY_ACCEPTED,
                message: 'termPolicy.error.alreadyAccepted',
            });
        }

        try {
            await this.termPolicyRepository.accept(
                userId,
                policy.id,
                type,
                requestLog
            );

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async create(
        { contents, type, version }: TermPolicyCreateRequestDto,
        createdBy: string
    ): Promise<IResponseReturn<TermPolicyResponseDto>> {
        const isExist = await this.termPolicyRepository.existByVersionAndType(
            version,
            type
        );
        if (isExist) {
            throw new ConflictException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.EXIST,
                message: 'termPolicy.error.exist',
            });
        }

        const isUniqueLanguages =
            this.termPolicyUtil.validateUniqueLanguages(contents);
        if (!isUniqueLanguages) {
            throw new BadRequestException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.REQUIRED_INVALID,
                message: 'termPolicy.error.contentsLanguageMustBeUnique',
            });
        }

        try {
            const mappedContents: TermContentDto[] = contents.map(
                ({ language, key, size }: TermPolicyContentRequestDto) => ({
                    language,
                    ...this.awsS3Service.mapPresign({
                        key,
                        size,
                    }),
                })
            );
            const created = await this.termPolicyRepository.create(
                { contents, type, version },
                mappedContents,
                createdBy
            );
            const termPolicy = this.termPolicyUtil.mapOne(created);

            return {
                data: termPolicy,
                metadataActivityLog:
                    this.termPolicyUtil.mapActivityLogMetadata(created),
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async delete(
        termPolicyId: string
    ): Promise<IResponseReturn<TermPolicyResponseDto>> {
        const termPolicy =
            await this.termPolicyRepository.findOneById(termPolicyId);
        if (!termPolicy) {
            throw new NotFoundException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'termPolicy.error.notFound',
            });
        } else if (termPolicy.status !== ENUM_TERM_POLICY_STATUS.draft) {
            throw new BadRequestException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.STATUS_INVALID,
                message: 'termPolicy.error.statusInvalid',
            });
        }

        try {
            const deleted =
                await this.termPolicyRepository.delete(termPolicyId);
            const termPolicy = this.termPolicyUtil.mapOne(deleted);

            return {
                data: termPolicy,
                metadataActivityLog:
                    this.termPolicyUtil.mapActivityLogMetadata(deleted),
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async generateContentPresign({
        language,
        size,
        type,
        version,
    }: TermPolicyContentPresignRequestDto): Promise<
        IResponseReturn<AwsS3PresignDto>
    > {
        const termPolicy =
            await this.termPolicyRepository.existByVersionAndType(
                version,
                type
            );
        if (
            termPolicy &&
            termPolicy.status === ENUM_TERM_POLICY_STATUS.published
        ) {
            throw new BadRequestException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.STATUS_INVALID,
                message: 'termPolicy.error.statusInvalid',
            });
        }

        const key: string =
            this.termPolicyUtil.createRandomFilenameContentWithPath(
                type,
                version,
                language,
                {
                    extension: ENUM_FILE_EXTENSION_DOCUMENT.PDF,
                }
            );

        const aws: AwsS3PresignDto = await this.awsS3Service.presignPutItem(
            {
                key,
                size,
            },
            {
                forceUpdate: true,
                access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE,
            }
        );

        return { data: aws };
    }

    async updateContent(
        termPolicyId: string,
        { key, size, language }: TermPolicyContentRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        const termPolicy =
            await this.termPolicyRepository.findOneById(termPolicyId);
        if (!termPolicy) {
            throw new NotFoundException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'termPolicy.error.notFound',
            });
        } else if (termPolicy.status === ENUM_TERM_POLICY_STATUS.published) {
            throw new BadRequestException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.STATUS_INVALID,
                message: 'termPolicy.error.statusInvalid',
            });
        }

        try {
            const mappedContent: TermContentDto = {
                language,
                ...this.awsS3Service.mapPresign({ key, size }),
            };
            const updated = await this.termPolicyRepository.updateContent(
                termPolicyId,
                termPolicy.contents as unknown as TermContentDto[],
                mappedContent,
                updatedBy
            );

            return {
                metadataActivityLog:
                    this.termPolicyUtil.mapActivityLogMetadata(updated),
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async addContent(
        termPolicyId: string,
        { key, size, language }: TermPolicyContentRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        const termPolicy =
            await this.termPolicyRepository.findOneById(termPolicyId);
        if (!termPolicy) {
            throw new NotFoundException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'termPolicy.error.notFound',
            });
        } else if (termPolicy.status === ENUM_TERM_POLICY_STATUS.published) {
            throw new BadRequestException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.STATUS_INVALID,
                message: 'termPolicy.error.statusInvalid',
            });
        }

        try {
            const mappedContent: TermContentDto = {
                language,
                ...this.awsS3Service.mapPresign({ key, size }),
            };
            const updated = await this.termPolicyRepository.addContent(
                termPolicyId,
                mappedContent,
                updatedBy
            );

            return {
                metadataActivityLog:
                    this.termPolicyUtil.mapActivityLogMetadata(updated),
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async removeContent(
        termPolicyId: string,
        { language }: TermPolicyRemoveContentRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        const termPolicy =
            await this.termPolicyRepository.findOneById(termPolicyId);
        if (!termPolicy) {
            throw new NotFoundException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'termPolicy.error.notFound',
            });
        } else if (termPolicy.status === ENUM_TERM_POLICY_STATUS.published) {
            throw new BadRequestException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.STATUS_INVALID,
                message: 'termPolicy.error.statusInvalid',
            });
        }

        try {
            const updated = await this.termPolicyRepository.removeContent(
                termPolicyId,
                termPolicy.contents as unknown as TermContentDto[],
                { language },
                updatedBy
            );

            return {
                metadataActivityLog:
                    this.termPolicyUtil.mapActivityLogMetadata(updated),
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async publish(
        termPolicyId: string,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        const termPolicy =
            await this.termPolicyRepository.findOneById(termPolicyId);
        if (!termPolicy) {
            throw new NotFoundException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'termPolicy.error.notFound',
            });
        } else if (termPolicy.status === ENUM_TERM_POLICY_STATUS.published) {
            throw new BadRequestException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.STATUS_INVALID,
                message: 'termPolicy.error.statusInvalid',
            });
        }

        try {
            const contentPublicPath = this.termPolicyUtil.getContentPublicPath(
                termPolicy.type
            );
            const contents = termPolicy.contents as unknown as TermContentDto[];
            const newItems = await this.awsS3Service.moveItems(
                contents.map(e => ({
                    ...e,
                    size: Number.parseFloat(e.size.toString()),
                })),
                contentPublicPath,
                {
                    access: ENUM_AWS_S3_ACCESSIBILITY.PUBLIC,
                }
            );

            const newContents = this.termPolicyUtil.mapPublicContent(
                newItems,
                contents
            );
            const updated = await this.termPolicyRepository.publish(
                termPolicyId,
                termPolicy.type,
                newContents,
                updatedBy
            );

            return {
                metadataActivityLog:
                    this.termPolicyUtil.mapActivityLogMetadata(updated),
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }
}
