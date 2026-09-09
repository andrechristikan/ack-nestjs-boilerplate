import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { IAwsS3 } from '@common/aws/interfaces/aws.interface';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { FileService } from '@common/file/services/file.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogMetadataStoreKey } from '@modules/activity-log/constants/activity-log.constant';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { TermPolicyContentEmptyException } from '@modules/term-policy/exceptions/term-policy.content-empty.exception';
import { TermPolicyExistException } from '@modules/term-policy/exceptions/term-policy.exist.exception';
import { TermPolicyLanguageDuplicateException } from '@modules/term-policy/exceptions/term-policy.language-duplicate.exception';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyStatusInvalidException } from '@modules/term-policy/exceptions/term-policy.status-invalid.exception';
import {
    ITermPolicy,
    ITermPolicyContentCreate,
    ITermPolicyContentUpload,
    ITermPolicyCreate,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { ITermPolicyService } from '@modules/term-policy/interfaces/term-policy.service.interface';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { Injectable } from '@nestjs/common';
import {
    EnumTermPolicyStatus,
    Prisma,
    TermPolicy,
    TermPolicyContent,
} from '@generated/prisma-client';

@Injectable()
export class TermPolicyService implements ITermPolicyService {
    constructor(
        private readonly termPolicyRepository: TermPolicyRepository,
        private readonly awsS3Service: AwsS3Service,
        private readonly termPolicyUtil: TermPolicyUtil,
        private readonly notificationQueue: NotificationQueue,
        private readonly requestStoreService: RequestStoreService,
        private readonly fileService: FileService
    ) {}

    private storeActivityLogMetadata(termPolicy: TermPolicy): void {
        this.requestStoreService.merge<IActivityLogMetadata>(
            ActivityLogMetadataStoreKey,
            this.termPolicyUtil.mapActivityLogMetadata(termPolicy)
        );

        return;
    }

    mapPublicContent(
        newItems: IAwsS3[],
        contents: TermPolicyContent[]
    ): ITermPolicyContentCreate[] {
        return newItems.map(item => {
            const language = contents.find(
                c =>
                    this.fileService.extractFilenameFromPath(c.key) ===
                    this.fileService.extractFilenameFromPath(item.key)
            )?.language as EnumMessageLanguage;

            return { ...item, language };
        });
    }

    async getListByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.TermPolicyWhereInput>,
        type?: Record<string, IPaginationIn>,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<ITermPolicy>> {
        return this.termPolicyRepository.find(pagination, type, status);
    }

    async getListPublished(
        pagination: IPaginationQueryCursorParams<Prisma.TermPolicyWhereInput>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<ITermPolicy>> {
        return this.termPolicyRepository.findPublished(pagination, type);
    }

    async createByAdmin(
        { contents, type, version }: ITermPolicyCreate,
        createdBy: string
    ): Promise<ITermPolicy> {
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
            const mappedContents: ITermPolicyContentCreate[] = contents.map(
                ({ language, key, size }: ITermPolicyContentUpload) => ({
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

            this.storeActivityLogMetadata(created);

            return created;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async deleteByAdmin(termPolicyId: string): Promise<TermPolicy> {
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

            this.storeActivityLogMetadata(deleted);

            return deleted;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async publishByAdmin(
        termPolicyId: string,
        updatedBy: string
    ): Promise<void> {
        const termPolicy =
            await this.termPolicyRepository.findOneById(termPolicyId);
        if (!termPolicy) {
            throw new TermPolicyNotFoundException();
        } else if (termPolicy.status === EnumTermPolicyStatus.published) {
            throw new TermPolicyStatusInvalidException();
        } else if (termPolicy.contents.length === 0) {
            throw new TermPolicyContentEmptyException();
        }

        try {
            const contentPublicPath =
                this.termPolicyUtil.getContentPublicPath(termPolicy);

            const newItems = await this.awsS3Service.moveItems(
                termPolicy.contents,
                contentPublicPath,
                {}
            );

            const newContents = this.mapPublicContent(
                newItems,
                termPolicy.contents
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

            await this.notificationQueue.sendPublishTermPolicy(
                {
                    type: termPolicy.type,
                    version: termPolicy.version,
                },
                updatedBy
            );

            this.storeActivityLogMetadata(updated);

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }
}
