import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
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
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { MessageService } from '@common/message/services/message.service';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IOutboxEffect } from '@modules/outbox/interfaces/outbox.interface';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { TermPolicyContentEmptyException } from '@modules/term-policy/exceptions/term-policy.content-empty.exception';
import { TermPolicyContentSizeExceededException } from '@modules/term-policy/exceptions/term-policy.content-size-exceeded.exception';
import { TermPolicyContentInvalidException } from '@modules/term-policy/exceptions/term-policy.content-invalid.exception';
import { TermPolicyContentKeyInvalidException } from '@modules/term-policy/exceptions/term-policy.content-key-invalid.exception';
import { TermPolicyExistException } from '@modules/term-policy/exceptions/term-policy.exist.exception';
import { TermPolicyLanguageDuplicateException } from '@modules/term-policy/exceptions/term-policy.language-duplicate.exception';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyStatusInvalidException } from '@modules/term-policy/exceptions/term-policy.status-invalid.exception';
import {
    EnumTermPolicyProcess,
    EnumTermPolicyQueue,
} from '@modules/term-policy/enums/term-policy.enum';
import type { TermPolicyContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';
import type {
    ITermPolicyContent,
    ITermPolicyContentUpload,
    ITermPolicyCopyContentPayload,
    ITermPolicyCreate,
    ITermPolicyRef,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnumTermPolicyStatus, Prisma } from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';

@Injectable()
export class TermPolicyService {
    private readonly copyContentIdempotencyKeyPattern: string;

    constructor(
        private readonly termPolicyRepository: TermPolicyRepository,
        private readonly awsS3Service: AwsS3Service,
        private readonly termPolicyUtil: TermPolicyUtil,
        private readonly messageService: MessageService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperArrayService: HelperArrayService,
        private readonly helperStringService: HelperStringService,
        private readonly outboxService: OutboxService,
        private readonly configService: ConfigService
    ) {
        this.copyContentIdempotencyKeyPattern = this.configService.get<string>(
            'termPolicy.idempotencyKey.copyContentPattern'
        )!;
    }

    private deleteContentEffect(path: string): IOutboxEffect {
        return {
            queue: EnumTermPolicyQueue.termPolicy,
            name: EnumTermPolicyProcess.deleteContent,
            data: { path },
            priority: EnumQueuePriority.low,
            idempotencyKey: null,
        };
    }

    private copyContentEffect(
        payload: ITermPolicyCopyContentPayload
    ): IOutboxEffect {
        const idempotencyKey = this.helperStringService.fillPattern(
            this.copyContentIdempotencyKeyPattern,
            {
                process: EnumTermPolicyProcess.copyContent,
                termPolicyId: payload.termPolicyId,
            }
        );

        return {
            queue: EnumTermPolicyQueue.termPolicy,
            name: EnumTermPolicyProcess.copyContent,
            data: payload,
            priority: EnumQueuePriority.high,
            idempotencyKey,
        };
    }

    private validateUniqueLanguages(
        contents: TermPolicyContentRequestDto[]
    ): boolean {
        const languages = contents.map(content => content.language);
        const uniqueLanguages = this.helperArrayService.unique(languages);
        return uniqueLanguages.length === languages.length;
    }

    private mapPublicContentKeys(
        { type, version }: ITermPolicyRef,
        contents: ITermPolicyContent[]
    ): ITermPolicyContentUpload[] {
        const destination = this.termPolicyUtil.getContentPublicPath(
            type,
            version
        );

        return contents.map(({ language, size, key }) => ({
            language,
            size,
            key: `${destination}/${key.slice(key.lastIndexOf('/') + 1)}`,
        }));
    }

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

        const isUniqueLanguages = this.validateUniqueLanguages(contents);
        if (!isUniqueLanguages) {
            throw new TermPolicyLanguageDuplicateException();
        }

        for (const { size, key } of contents) {
            const isSizeAllowed =
                this.termPolicyUtil.isContentSizeAllowed(size);
            if (!isSizeAllowed) {
                throw new TermPolicyContentSizeExceededException();
            }

            const isInPath = this.termPolicyUtil.isContentKeyInPath(
                type,
                version,
                key
            );
            if (!isInPath) {
                throw new TermPolicyContentKeyInvalidException();
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

            const isVersionCollision = this.databaseUtil.isUniqueCollision(
                err,
                'version'
            );
            if (isVersionCollision) {
                throw new TermPolicyExistException();
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
        // Sequential by design: gate before the work it guards; write must not run if an earlier step throws
        const termPolicy =
            await this.termPolicyRepository.findOneById(termPolicyId);
        if (!termPolicy) {
            throw new TermPolicyNotFoundException();
        } else if (termPolicy.status !== EnumTermPolicyStatus.draft) {
            throw new TermPolicyStatusInvalidException();
        }

        try {
            const contentPath = this.termPolicyUtil.getPath(
                termPolicy.type,
                termPolicy.version
            );
            await this.outboxService.withTransaction(async tx => {
                const isDeleted =
                    await this.termPolicyRepository.deleteDraftInTx(
                        tx,
                        termPolicyId
                    );
                if (!isDeleted) {
                    throw new TermPolicyStatusInvalidException();
                }

                const effect = this.deleteContentEffect(contentPath);
                await this.outboxService.addInTx(tx, effect);
            });

            return termPolicy;
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

    async publishByAdmin(termPolicyId: string): Promise<TermPolicy> {
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
            const publicKeys = this.mapPublicContentKeys(termPolicy, contents);
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
                await this.outboxService.withTransaction<TermPolicy>(
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

                        const effect = this.copyContentEffect({
                            termPolicyId,
                            contents,
                            destination,
                        });
                        await this.outboxService.addInTx(tx, effect);

                        return row;
                    }
                );

            return published;
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
