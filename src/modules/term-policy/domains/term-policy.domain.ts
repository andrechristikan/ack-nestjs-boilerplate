import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import type { IAwsS3 } from '@common/aws/interfaces/aws.interface';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { FileService } from '@common/file/services/file.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStagedEvent } from '@modules/activity-log/interfaces/activity-log.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { TermPolicyContentEmptyException } from '@modules/term-policy/exceptions/term-policy.content-empty.exception';
import { TermPolicyExistException } from '@modules/term-policy/exceptions/term-policy.exist.exception';
import { TermPolicyLanguageDuplicateException } from '@modules/term-policy/exceptions/term-policy.language-duplicate.exception';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyStatusInvalidException } from '@modules/term-policy/exceptions/term-policy.status-invalid.exception';
import type {
    ITermPolicy,
    ITermPolicyContentCreate,
    ITermPolicyContentUpload,
    ITermPolicyCreate,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { UserDomain } from '@modules/user/domains/user.domain';
import { Injectable } from '@nestjs/common';
import {
    EnumActivityLogAction,
    EnumTermPolicyStatus,
    Prisma,
} from '@generated/prisma-client/client';
import type {
    TermPolicy,
    TermPolicyContent,
} from '@generated/prisma-client/client';

@Injectable()
export class TermPolicyDomain {
    constructor(
        private readonly termPolicyRepository: TermPolicyRepository,
        private readonly awsS3Service: AwsS3Service,
        private readonly termPolicyUtil: TermPolicyUtil,
        private readonly notificationQueue: NotificationQueue,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly fileService: FileService,
        private readonly databaseService: DatabaseService,
        private readonly userDomain: UserDomain,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    private prepareActivityLog(
        action: EnumActivityLogAction,
        termPolicy: Pick<TermPolicy, 'id' | 'type' | 'version'>,
        timestamp: Date
    ): IActivityLogStagedEvent {
        return this.activityLogDomain.prepare({
            action,
            metadata: this.termPolicyUtil.mapActivityLogMetadata(
                termPolicy,
                timestamp
            ),
        });
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

    async createByAdmin({
        contents,
        type,
        version,
    }: ITermPolicyCreate): Promise<ITermPolicy> {
        const isExist = await this.termPolicyRepository.existsByVersionAndType(
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
            const termPolicyId = this.databaseUtil.createId();
            const event = this.prepareActivityLog(
                EnumActivityLogAction.adminTermPolicyCreate,
                { id: termPolicyId, type, version },
                this.helperDateService.create()
            );
            const created = await this.termPolicyRepository.create(
                termPolicyId,
                { contents, type, version },
                mappedContents
            );

            this.activityLogDomain.stagePrepared([event]);

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
            const event = this.prepareActivityLog(
                EnumActivityLogAction.adminTermPolicyDelete,
                termPolicy,
                this.helperDateService.create()
            );
            const [deleted] = await Promise.all([
                this.termPolicyRepository.delete(termPolicyId),
                this.awsS3Service.deleteDir(contentPath, {
                    access: EnumAwsS3Accessibility.private,
                }),
            ]);

            this.activityLogDomain.stagePrepared([event]);

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
            const contentPublicPath = this.termPolicyUtil.getContentPublicPath(
                termPolicy.type,
                termPolicy.version
            );

            const privateContents: IAwsS3[] = termPolicy.contents.map(
                ({ access, ...content }) => ({
                    ...content,
                    access: access as EnumAwsS3Accessibility,
                })
            );
            const newItems = await this.awsS3Service.copyItems(
                privateContents,
                contentPublicPath,
                { access: EnumAwsS3Accessibility.public }
            );

            const newContents = this.mapPublicContent(
                newItems,
                termPolicy.contents
            );

            const events = await this.databaseService.withTransaction(
                async tx => {
                    const row = await this.termPolicyRepository.publishInTx(
                        tx,
                        termPolicyId,
                        newContents
                    );
                    await this.userDomain.resetTermPolicyForActiveUsersInTx(
                        tx,
                        termPolicy.type
                    );

                    return [
                        this.prepareActivityLog(
                            EnumActivityLogAction.adminTermPolicyPublish,
                            row,
                            row.updatedAt
                        ),
                    ];
                }
            );

            await this.notificationQueue.sendPublishTermPolicy(
                {
                    type: termPolicy.type,
                    version: termPolicy.version,
                },
                updatedBy
            );

            this.activityLogDomain.stagePrepared(events);

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }
}
