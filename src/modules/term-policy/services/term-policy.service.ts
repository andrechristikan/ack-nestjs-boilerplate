import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { AwsS3PresignDto } from '@common/aws/dtos/aws.s3-presign.dto';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { EnumFileExtensionTemplate } from '@common/file/enums/file.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
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
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { TermPolicyAcceptRequestDto } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import { TermPolicyContentPresignRequestDto } from '@modules/term-policy/dtos/request/term-policy.content-presign.request.dto';
import { TermPolicyContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';
import { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import { TermPolicyRemoveContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.remove-content.request.dto';
import { TermPolicyResponseDto } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import { TermPolicyUserAcceptanceResponseDto } from '@modules/term-policy/dtos/response/term-policy.user-acceptance.response.dto';
import { TermContentDto } from '@modules/term-policy/dtos/term-policy.content.dto';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';
import { ITermPolicyService } from '@modules/term-policy/interfaces/term-policy.service.interface';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
    TermPolicy,
} from '@prisma/client';

@Injectable()
export class TermPolicyService implements ITermPolicyService {
    constructor(
        private readonly termPolicyRepository: TermPolicyRepository,
        private readonly termPolicyUtil: TermPolicyUtil,
        private readonly awsS3Service: AwsS3Service
    ) {}

    async validateTermPolicyGuard(
        request: IRequestApp,
        requiredTermPolicies: EnumTermPolicyType[]
    ): Promise<void> {
        const { __user, user } = request;

        if (!__user || !user) {
            throw new ForbiddenException({
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        const { termPolicy } = __user;

        const defaultTermPolicies = [
            EnumTermPolicyType.termsOfService,
            EnumTermPolicyType.privacy,
        ];
        requiredTermPolicies =
            requiredTermPolicies.length === 0
                ? defaultTermPolicies
                : requiredTermPolicies;

        if (!requiredTermPolicies.every(type => termPolicy[type])) {
            throw new ForbiddenException({
                statusCode: EnumTermPolicyStatusCodeError.requiredInvalid,
                message: 'termPolicy.error.requiredInvalid',
            });
        }
    }

    async getListByAdmin(
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
                statusCode: EnumTermPolicyStatusCodeError.notFound,
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
                statusCode: EnumTermPolicyStatusCodeError.alreadyAccepted,
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
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async createByAdmin(
        { contents, type, version }: TermPolicyCreateRequestDto,
        createdBy: string
    ): Promise<IResponseReturn<TermPolicyResponseDto>> {
        const isExist = await this.termPolicyRepository.existByVersionAndType(
            version,
            type
        );
        if (isExist) {
            throw new ConflictException({
                statusCode: EnumTermPolicyStatusCodeError.exist,
                message: 'termPolicy.error.exist',
            });
        }

        const isUniqueLanguages =
            this.termPolicyUtil.validateUniqueLanguages(contents);
        if (!isUniqueLanguages) {
            throw new BadRequestException({
                statusCode: EnumTermPolicyStatusCodeError.requiredInvalid,
                message: 'termPolicy.error.contentsLanguageMustBeUnique',
            });
        }

        try {
            const mappedContents: TermContentDto[] = contents.map(
                ({ language, key, size }: TermPolicyContentRequestDto) => ({
                    language,
                    ...this.awsS3Service.mapPresign(
                        {
                            key,
                            size,
                        },
                        {
                            access: EnumAwsS3Accessibility.private,
                        }
                    ),
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
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async deleteByAdmin(
        termPolicyId: string
    ): Promise<IResponseReturn<TermPolicyResponseDto>> {
        const termPolicy: TermPolicy =
            await this.termPolicyRepository.findOneById(termPolicyId);
        if (!termPolicy) {
            throw new NotFoundException({
                statusCode: EnumTermPolicyStatusCodeError.notFound,
                message: 'termPolicy.error.notFound',
            });
        } else if (termPolicy.status !== EnumTermPolicyStatus.draft) {
            throw new BadRequestException({
                statusCode: EnumTermPolicyStatusCodeError.statusInvalid,
                message: 'termPolicy.error.statusInvalid',
            });
        }

        try {
            const contentPath = this.termPolicyUtil.getPath(termPolicy);
            const [deleted] = await Promise.all([
                this.termPolicyRepository.delete(termPolicyId),
                this.awsS3Service.deleteDir(contentPath, {
                    access: EnumAwsS3Accessibility.private,
                }),
            ]);

            const mapped = this.termPolicyUtil.mapOne(deleted);

            return {
                data: mapped,
                metadataActivityLog:
                    this.termPolicyUtil.mapActivityLogMetadata(deleted),
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async generateContentPresignByAdmin({
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
            termPolicy.status === EnumTermPolicyStatus.published
        ) {
            throw new BadRequestException({
                statusCode: EnumTermPolicyStatusCodeError.statusInvalid,
                message: 'termPolicy.error.statusInvalid',
            });
        }

        const key: string =
            this.termPolicyUtil.createRandomFilenameContentWithPath(
                type,
                version,
                language,
                {
                    extension: EnumFileExtensionTemplate.hbs,
                }
            );

        const aws: AwsS3PresignDto = await this.awsS3Service.presignPutItem(
            {
                key,
                size,
            },
            {
                forceUpdate: true,
                access: EnumAwsS3Accessibility.private,
            }
        );

        return { data: aws };
    }

    async updateContentByAdmin(
        termPolicyId: string,
        { key, size, language }: TermPolicyContentRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        const termPolicy =
            await this.termPolicyRepository.findOneById(termPolicyId);
        if (!termPolicy) {
            throw new NotFoundException({
                statusCode: EnumTermPolicyStatusCodeError.notFound,
                message: 'termPolicy.error.notFound',
            });
        } else if (termPolicy.status === EnumTermPolicyStatus.published) {
            throw new BadRequestException({
                statusCode: EnumTermPolicyStatusCodeError.statusInvalid,
                message: 'termPolicy.error.statusInvalid',
            });
        }

        try {
            const mappedContent: TermContentDto = {
                language,
                ...this.awsS3Service.mapPresign(
                    { key, size },
                    {
                        access: EnumAwsS3Accessibility.private,
                    }
                ),
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
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async addContentByAdmin(
        termPolicyId: string,
        { key, size, language }: TermPolicyContentRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        const termPolicy =
            await this.termPolicyRepository.findOneById(termPolicyId);
        if (!termPolicy) {
            throw new NotFoundException({
                statusCode: EnumTermPolicyStatusCodeError.notFound,
                message: 'termPolicy.error.notFound',
            });
        } else if (termPolicy.status === EnumTermPolicyStatus.published) {
            throw new BadRequestException({
                statusCode: EnumTermPolicyStatusCodeError.statusInvalid,
                message: 'termPolicy.error.statusInvalid',
            });
        }

        const existingContent = this.termPolicyUtil.getContentByLanguage(
            termPolicy.contents as unknown as TermContentDto[],
            language
        );
        if (existingContent) {
            throw new ConflictException({
                statusCode: EnumTermPolicyStatusCodeError.contentExist,
                message: 'termPolicy.error.contentExist',
            });
        }

        try {
            const mappedContent: TermContentDto = {
                language,
                ...this.awsS3Service.mapPresign(
                    { key, size },
                    {
                        access: EnumAwsS3Accessibility.private,
                    }
                ),
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
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async removeContentByAdmin(
        termPolicyId: string,
        { language }: TermPolicyRemoveContentRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        const termPolicy =
            await this.termPolicyRepository.findOneById(termPolicyId);
        if (!termPolicy) {
            throw new NotFoundException({
                statusCode: EnumTermPolicyStatusCodeError.notFound,
                message: 'termPolicy.error.notFound',
            });
        } else if (termPolicy.status === EnumTermPolicyStatus.published) {
            throw new BadRequestException({
                statusCode: EnumTermPolicyStatusCodeError.statusInvalid,
                message: 'termPolicy.error.statusInvalid',
            });
        }

        const existingContent = this.termPolicyUtil.getContentByLanguage(
            termPolicy.contents as unknown as TermContentDto[],
            language
        );
        if (!existingContent) {
            throw new NotFoundException({
                statusCode: EnumTermPolicyStatusCodeError.contentNotFound,
                message: 'termPolicy.error.contentNotFound',
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
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async getContentByAdmin(
        termPolicyId: string,
        language: EnumMessageLanguage
    ): Promise<IResponseReturn<AwsS3PresignDto>> {
        const termPolicy =
            await this.termPolicyRepository.findOneById(termPolicyId);
        if (!termPolicy) {
            throw new NotFoundException({
                statusCode: EnumTermPolicyStatusCodeError.notFound,
                message: 'termPolicy.error.notFound',
            });
        }

        const existContent = this.termPolicyUtil.getContentByLanguage(
            termPolicy.contents as unknown as TermContentDto[],
            language
        );
        if (!existContent) {
            throw new NotFoundException({
                statusCode: EnumTermPolicyStatusCodeError.contentNotFound,
                message: 'termPolicy.error.contentNotFound',
            });
        }

        const awsPresign = await this.awsS3Service.presignGetItem(
            existContent.key,
            {
                access: EnumAwsS3Accessibility.private,
            }
        );

        return { data: awsPresign };
    }

    async publishByAdmin(
        termPolicyId: string,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        const termPolicy =
            await this.termPolicyRepository.findOneById(termPolicyId);
        if (!termPolicy) {
            throw new NotFoundException({
                statusCode: EnumTermPolicyStatusCodeError.notFound,
                message: 'termPolicy.error.notFound',
            });
        } else if (termPolicy.status === EnumTermPolicyStatus.published) {
            throw new BadRequestException({
                statusCode: EnumTermPolicyStatusCodeError.statusInvalid,
                message: 'termPolicy.error.statusInvalid',
            });
        } else if (
            (termPolicy.contents as unknown as TermContentDto[]).length === 0
        ) {
            throw new BadRequestException({
                statusCode: EnumTermPolicyStatusCodeError.contentEmpty,
                message: 'termPolicy.error.contentEmpty',
            });
        }

        try {
            const contentPublicPath =
                this.termPolicyUtil.getContentPublicPath(termPolicy);
            const contents = termPolicy.contents as unknown as TermContentDto[];

            const newItems = await this.awsS3Service.moveItems(
                contents,
                contentPublicPath,
                {}
            );

            const newContents = this.termPolicyUtil.mapPublicContent(
                newItems,
                contents
            );

            const contentPath = this.termPolicyUtil.getPath(termPolicy);
            const [updated] = await Promise.all([
                this.termPolicyRepository.publish(
                    termPolicyId,
                    termPolicy.type,
                    newContents,
                    updatedBy
                ),
                this.awsS3Service.deleteDir(contentPath, {
                    access: EnumAwsS3Accessibility.private,
                }),
            ]);

            return {
                metadataActivityLog:
                    this.termPolicyUtil.mapActivityLogMetadata(updated),
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }
}
