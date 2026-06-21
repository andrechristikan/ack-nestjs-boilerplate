import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { AwsS3PresignResponseDto } from '@common/aws/dtos/response/aws.s3-presign.response.dto';
import { IAwsS3Presign } from '@common/aws/interfaces/aws.interface';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { AwsServiceUnavailableException } from '@common/aws/exceptions/aws.service-unavailable.exception';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { EnumFileExtensionTemplate } from '@common/file/enums/file.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { TermPolicyAcceptRequestDto } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import { TermPolicyContentPresignRequestDto } from '@modules/term-policy/dtos/request/term-policy.content-presign.request.dto';
import { TermPolicyContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';
import { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import { TermPolicyRemoveContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.remove-content.request.dto';
import { TermPolicyResponseDto } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import { TermPolicyUserAcceptanceResponseDto } from '@modules/term-policy/dtos/response/term-policy.user-acceptance.response.dto';
import { TermContentDto } from '@modules/term-policy/dtos/term-policy.content.dto';
import { TermPolicyAlreadyAcceptedException } from '@modules/term-policy/exceptions/term-policy.already-accepted.exception';
import { TermPolicyContentEmptyException } from '@modules/term-policy/exceptions/term-policy.content-empty.exception';
import { TermPolicyContentExistException } from '@modules/term-policy/exceptions/term-policy.content-exist.exception';
import { TermPolicyContentNotFoundException } from '@modules/term-policy/exceptions/term-policy.content-not-found.exception';
import { TermPolicyExistException } from '@modules/term-policy/exceptions/term-policy.exist.exception';
import { TermPolicyLanguageDuplicateException } from '@modules/term-policy/exceptions/term-policy.language-duplicate.exception';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyRequiredInvalidException } from '@modules/term-policy/exceptions/term-policy.required-invalid.exception';
import { TermPolicyStatusInvalidException } from '@modules/term-policy/exceptions/term-policy.status-invalid.exception';
import { ITermPolicyService } from '@modules/term-policy/interfaces/term-policy.service.interface';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { IUser } from '@modules/user/interfaces/user.interface';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { ActivityLogMetadataStoreKey } from '@modules/activity-log/constants/activity-log.constant';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
    Prisma,
} from '@generated/prisma-client';

@Injectable()
export class TermPolicyService implements ITermPolicyService {
    constructor(
        private readonly termPolicyRepository: TermPolicyRepository,
        private readonly awsS3Service: AwsS3Service,
        private readonly termPolicyUtil: TermPolicyUtil,
        private readonly notificationUtil: NotificationUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async validateTermPolicyGuard(
        user: IUser | null,
        requiredTermPolicies: EnumTermPolicyType[]
    ): Promise<void> {
        if (!user) {
            throw new AuthJwtAccessTokenInvalidException();
        }

        const { termPolicy } = user;

        const defaultTermPolicies = [
            EnumTermPolicyType.termsOfService,
            EnumTermPolicyType.privacy,
        ];
        requiredTermPolicies =
            requiredTermPolicies.length === 0
                ? defaultTermPolicies
                : requiredTermPolicies;

        if (!requiredTermPolicies.every(type => termPolicy[type])) {
            throw new TermPolicyRequiredInvalidException();
        }
    }

    async getListByAdmin(
        pagination: IPaginationQueryOffsetParams<
            Prisma.TermPolicySelect,
            Prisma.TermPolicyWhereInput
        >,
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
        pagination: IPaginationQueryCursorParams<
            Prisma.TermPolicySelect,
            Prisma.TermPolicyWhereInput
        >,
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
        pagination: IPaginationQueryCursorParams<
            Prisma.TermPolicyUserAcceptanceSelect,
            Prisma.TermPolicyUserAcceptanceWhereInput
        >
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
        user: IUser,
        { type }: TermPolicyAcceptRequestDto
    ): Promise<IResponseReturn<void>> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        const policy =
            await this.termPolicyRepository.existLatestPublishedByType(type);
        if (!policy) {
            throw new TermPolicyNotFoundException();
        }

        const exist =
            await this.termPolicyRepository.existAcceptanceByPolicyAndUser(
                user.id,
                policy.id
            );
        if (exist) {
            throw new TermPolicyAlreadyAcceptedException();
        }

        try {
            await this.termPolicyRepository.accept(
                user,
                policy.id,
                type,
                requestLog
            );

            // @note: send notification after accepting term policy
            await this.notificationUtil.sendUserAcceptTermPolicy(user.id, {
                termPolicyId: policy.id,
                type: policy.type,
                version: policy.version,
            });

            return {};
        } catch (err: unknown) {
            throw new AppUnknownException(err);
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
            throw new TermPolicyExistException();
        }

        const isUniqueLanguages =
            this.termPolicyUtil.validateUniqueLanguages(contents);
        if (!isUniqueLanguages) {
            throw new TermPolicyLanguageDuplicateException();
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

            this.requestStoreService.merge<IActivityLogMetadata>(
                ActivityLogMetadataStoreKey,
                this.termPolicyUtil.mapActivityLogMetadata(created)
            );

            return {
                data: termPolicy,
            };
        } catch (err: unknown) {
            throw new AppUnknownException(err);
        }
    }

    async deleteByAdmin(
        termPolicyId: string
    ): Promise<IResponseReturn<TermPolicyResponseDto>> {
        const termPolicy =
            await this.termPolicyRepository.findOneById(termPolicyId);
        if (!termPolicy) {
            throw new TermPolicyNotFoundException();
        } else if (termPolicy.status !== EnumTermPolicyStatus.draft) {
            throw new TermPolicyStatusInvalidException();
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

            this.requestStoreService.merge<IActivityLogMetadata>(
                ActivityLogMetadataStoreKey,
                this.termPolicyUtil.mapActivityLogMetadata(deleted)
            );

            return {
                data: mapped,
            };
        } catch (err: unknown) {
            throw new AppUnknownException(err);
        }
    }

    async generateContentPresignByAdmin({
        language,
        size,
        type,
        version,
    }: TermPolicyContentPresignRequestDto): Promise<
        IResponseReturn<AwsS3PresignResponseDto>
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
            throw new TermPolicyStatusInvalidException();
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

        const aws: IAwsS3Presign | null =
            await this.awsS3Service.presignPutItem(
                {
                    key,
                    size,
                },
                {
                    forceUpdate: true,
                    access: EnumAwsS3Accessibility.private,
                }
            );

        if (!aws) {
            throw new AwsServiceUnavailableException();
        }

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
            throw new TermPolicyNotFoundException();
        } else if (termPolicy.status === EnumTermPolicyStatus.published) {
            throw new TermPolicyStatusInvalidException();
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

            this.requestStoreService.merge<IActivityLogMetadata>(
                ActivityLogMetadataStoreKey,
                this.termPolicyUtil.mapActivityLogMetadata(updated)
            );

            return {};
        } catch (err: unknown) {
            throw new AppUnknownException(err);
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
            throw new TermPolicyNotFoundException();
        } else if (termPolicy.status === EnumTermPolicyStatus.published) {
            throw new TermPolicyStatusInvalidException();
        }

        const existingContent = this.termPolicyUtil.getContentByLanguage(
            termPolicy.contents as unknown as TermContentDto[],
            language
        );
        if (existingContent) {
            throw new TermPolicyContentExistException();
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

            this.requestStoreService.merge<IActivityLogMetadata>(
                ActivityLogMetadataStoreKey,
                this.termPolicyUtil.mapActivityLogMetadata(updated)
            );

            return {};
        } catch (err: unknown) {
            throw new AppUnknownException(err);
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
            throw new TermPolicyNotFoundException();
        } else if (termPolicy.status === EnumTermPolicyStatus.published) {
            throw new TermPolicyStatusInvalidException();
        }

        const existingContent = this.termPolicyUtil.getContentByLanguage(
            termPolicy.contents as unknown as TermContentDto[],
            language
        );
        if (!existingContent) {
            throw new TermPolicyContentNotFoundException();
        }

        try {
            const updated = await this.termPolicyRepository.removeContent(
                termPolicyId,
                termPolicy.contents as unknown as TermContentDto[],
                { language },
                updatedBy
            );

            this.requestStoreService.merge<IActivityLogMetadata>(
                ActivityLogMetadataStoreKey,
                this.termPolicyUtil.mapActivityLogMetadata(updated)
            );

            return {};
        } catch (err: unknown) {
            throw new AppUnknownException(err);
        }
    }

    async getContentByAdmin(
        termPolicyId: string,
        language: EnumMessageLanguage
    ): Promise<IResponseReturn<AwsS3PresignResponseDto>> {
        const termPolicy =
            await this.termPolicyRepository.findOneById(termPolicyId);
        if (!termPolicy) {
            throw new TermPolicyNotFoundException();
        }

        const existContent = this.termPolicyUtil.getContentByLanguage(
            termPolicy.contents as unknown as TermContentDto[],
            language
        );
        if (!existContent) {
            throw new TermPolicyContentNotFoundException();
        }

        const awsPresign: IAwsS3Presign | null =
            await this.awsS3Service.presignGetItem(existContent.key, {
                access: EnumAwsS3Accessibility.private,
            });

        if (!awsPresign) {
            throw new AwsServiceUnavailableException();
        }

        return { data: awsPresign };
    }

    async publishByAdmin(
        termPolicyId: string,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        const termPolicy =
            await this.termPolicyRepository.findOneById(termPolicyId);
        if (!termPolicy) {
            throw new TermPolicyNotFoundException();
        } else if (termPolicy.status === EnumTermPolicyStatus.published) {
            throw new TermPolicyStatusInvalidException();
        } else if (
            (termPolicy.contents as unknown as TermContentDto[]).length === 0
        ) {
            throw new TermPolicyContentEmptyException();
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

            // @note: send email after all creation
            await this.notificationUtil.sendPublishTermPolicy(
                {
                    type: termPolicy.type,
                    version: termPolicy.version,
                },
                updatedBy
            );

            this.requestStoreService.merge<IActivityLogMetadata>(
                ActivityLogMetadataStoreKey,
                this.termPolicyUtil.mapActivityLogMetadata(updated)
            );

            return {};
        } catch (err: unknown) {
            throw new AppUnknownException(err);
        }
    }
}
