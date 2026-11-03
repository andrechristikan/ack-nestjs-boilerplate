import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { AwsS3NotConfiguredException } from '@common/aws/exceptions/aws.s3-not-configured.exception';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { MessageService } from '@common/message/services/message.service';
import { QueueException } from '@queues/exceptions/queue.exception';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { TermPolicyContentEmptyException } from '@modules/term-policy/exceptions/term-policy.content-empty.exception';
import { TermPolicyContentSizeExceededException } from '@modules/term-policy/exceptions/term-policy.content-size-exceeded.exception';
import { TermPolicyContentInvalidException } from '@modules/term-policy/exceptions/term-policy.content-invalid.exception';
import { TermPolicyExistException } from '@modules/term-policy/exceptions/term-policy.exist.exception';
import { TermPolicyLanguageDuplicateException } from '@modules/term-policy/exceptions/term-policy.language-duplicate.exception';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyStatusInvalidException } from '@modules/term-policy/exceptions/term-policy.status-invalid.exception';
import type {
    ITermPolicyContent,
    ITermPolicyContentUpload,
    ITermPolicyCopyContentPayload,
    ITermPolicyCreate,
    ITermPolicyPublish,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyQueue } from '@modules/term-policy/queues/term-policy.queue';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { Injectable } from '@nestjs/common';
import { EnumTermPolicyStatus, Prisma } from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';

@Injectable()
export class TermPolicyDomain {
    constructor(
        private readonly termPolicyRepository: TermPolicyRepository,
        private readonly awsS3Service: AwsS3Service,
        private readonly termPolicyUtil: TermPolicyUtil,
        private readonly messageService: MessageService,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly termPolicyQueue: TermPolicyQueue
    ) {}

    async getListByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.TermPolicyWhereInput>,
        type?: Record<string, IPaginationIn>,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePaginationReturn<TermPolicy>> {
        return this.termPolicyRepository.find(
            pagination,
            type ?? null,
            status ?? null
        );
    }

    async getListPublished(
        pagination: IPaginationQueryCursorParams<Prisma.TermPolicyWhereInput>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePaginationReturn<TermPolicy>> {
        return this.termPolicyRepository.findPublished(
            pagination,
            type ?? null
        );
    }

    async createByAdmin(
        termPolicyId: string,
        { contents, type, version }: ITermPolicyCreate
    ): Promise<TermPolicy> {
        // Sequential by design: gate before the work it guards
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

        for (const { size } of contents) {
            const isSizeAllowed =
                this.termPolicyUtil.isContentSizeAllowed(size);
            if (!isSizeAllowed) {
                throw new TermPolicyContentSizeExceededException();
            }
        }

        const isS3Initialized = this.awsS3Service.isInitialized();
        if (!isS3Initialized) {
            throw new AwsS3NotConfiguredException();
        }

        try {
            const mappedContents: ITermPolicyContent[] = contents.map(
                ({ language, key, size }: ITermPolicyContentUpload) => {
                    const presign = this.awsS3Service.mapPresign(
                        {
                            key,
                            size,
                        },
                        {
                            access: EnumAwsS3Accessibility.private,
                        }
                    );

                    return { language, ...presign };
                }
            );

            return await this.termPolicyRepository.create(
                termPolicyId,
                { contents, type, version },
                mappedContents
            );
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async deleteContentDir(path: string): Promise<void> {
        await this.awsS3Service.deleteDir(path, {
            access: EnumAwsS3Accessibility.private,
        });
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
            // Sequential by design: write must not run if an earlier step throws
            const isDeleted =
                await this.termPolicyRepository.deleteDraft(termPolicyId);
            if (!isDeleted) {
                throw new TermPolicyStatusInvalidException();
            }

            await this.termPolicyQueue.deleteContent(contentPath);

            return termPolicy;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async publishByAdmin(termPolicyId: string): Promise<ITermPolicyPublish> {
        const termPolicy =
            await this.termPolicyRepository.findOneById(termPolicyId);
        if (!termPolicy) {
            throw new TermPolicyNotFoundException();
        }
        if (termPolicy.status !== EnumTermPolicyStatus.draft) {
            throw new TermPolicyStatusInvalidException();
        }

        const contents = this.termPolicyUtil.toContents(termPolicy.contents);
        if (contents instanceof TermPolicyContentInvalidException) {
            throw contents;
        }
        if (contents.length === 0) {
            throw new TermPolicyContentEmptyException();
        }

        const isS3Initialized = this.awsS3Service.isInitialized();
        if (!isS3Initialized) {
            throw new AwsS3NotConfiguredException();
        }

        try {
            const destination = this.termPolicyUtil.getContentPublicPath(
                termPolicy.type,
                termPolicy.version
            );
            const publicKeys = this.termPolicyUtil.mapPublicContentKeys(
                termPolicy,
                contents
            );
            const publicContents: ITermPolicyContent[] = publicKeys.map(
                ({ language, key, size }: ITermPolicyContentUpload) => {
                    const presign = this.awsS3Service.mapPresign(
                        { key, size },
                        { access: EnumAwsS3Accessibility.public }
                    );

                    return { language, ...presign };
                }
            );

            const published =
                await this.databaseService.withTransaction<TermPolicy>(
                    async tx => {
                        const isPublished =
                            await this.termPolicyRepository.publishInTx(
                                tx,
                                termPolicyId,
                                publicContents
                            );
                        if (!isPublished) {
                            throw new TermPolicyStatusInvalidException();
                        }

                        const row =
                            await this.termPolicyRepository.findOneByIdInTx(
                                tx,
                                termPolicyId
                            );
                        if (!row) {
                            throw new TermPolicyNotFoundException();
                        }

                        await this.termPolicyRepository.archivePublishedByTypeInTx(
                            tx,
                            row.type,
                            row.version
                        );
                        const hasNewerPublished =
                            await this.termPolicyRepository.existsNewerPublishedInTx(
                                tx,
                                row.type,
                                row.version
                            );
                        if (hasNewerPublished) {
                            throw new TermPolicyStatusInvalidException();
                        }

                        return row;
                    }
                );

            return {
                termPolicy: published,
                copy: { termPolicyId, contents, destination },
            };
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new TermPolicyStatusInvalidException();
            }

            throw new AppUnknownException(err);
        }
    }

    async copyContent({
        termPolicyId,
        contents,
        destination,
    }: ITermPolicyCopyContentPayload): Promise<void> {
        const copied = await this.awsS3Service.copyItems(
            contents,
            destination,
            { access: EnumAwsS3Accessibility.public }
        );
        if (copied.length !== contents.length) {
            const message = this.messageService.setMessage(
                'termPolicy.queue.error.copyContent',
                { properties: { termPolicyId } }
            );

            throw new QueueException(message, true);
        }
    }

    async getPublishedByAdmin(termPolicyId: string): Promise<TermPolicy> {
        const termPolicy =
            await this.termPolicyRepository.findOneById(termPolicyId);
        if (!termPolicy) {
            throw new TermPolicyNotFoundException();
        }
        if (termPolicy.status !== EnumTermPolicyStatus.published) {
            throw new TermPolicyStatusInvalidException();
        }

        return termPolicy;
    }
}
