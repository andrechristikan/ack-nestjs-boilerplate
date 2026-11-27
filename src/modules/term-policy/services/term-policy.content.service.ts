import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { EnumAwsS3Accessibility } from '@generated/prisma-client/client';
import { AwsS3NotConfiguredException } from '@common/aws/exceptions/aws.s3-not-configured.exception';
import type {
    IAwsS3,
    IAwsS3Presign,
} from '@common/aws/interfaces/aws.interface';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { EnumFileExtensionTemplate } from '@common/file/enums/file.enum';
import { FileSniffSizeInBytes } from '@common/file/constants/file.constant';
import { FileService } from '@common/file/services/file.service';
import { NoSuchKey, NotFound } from '@aws-sdk/client-s3';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { TermPolicyContentExistException } from '@modules/term-policy/exceptions/term-policy.content-exist.exception';
import { TermPolicyContentKeyInvalidException } from '@modules/term-policy/exceptions/term-policy.content-key-invalid.exception';
import { TermPolicyContentInvalidException } from '@modules/term-policy/exceptions/term-policy.content-invalid.exception';
import { TermPolicyContentTypeInvalidException } from '@modules/term-policy/exceptions/term-policy.content-type-invalid.exception';
import { TermPolicyContentSizeExceededException } from '@modules/term-policy/exceptions/term-policy.content-size-exceeded.exception';
import { TermPolicyContentNotFoundException } from '@modules/term-policy/exceptions/term-policy.content-not-found.exception';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyStatusInvalidException } from '@modules/term-policy/exceptions/term-policy.status-invalid.exception';
import type {
    ITermPolicyContent,
    ITermPolicyContentCheck,
    ITermPolicyContentConfirm,
    ITermPolicyContentPrepared,
    ITermPolicyContentPresign,
    ITermPolicyContentUploadPrepared,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyQueue } from '@modules/term-policy/queues/term-policy.queue';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { Injectable } from '@nestjs/common';
import {
    EnumActivityLogAction,
    EnumTermPolicyStatus,
} from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class TermPolicyContentService {
    constructor(
        private readonly termPolicyRepository: TermPolicyRepository,
        private readonly awsS3Service: AwsS3Service,
        private readonly termPolicyUtil: TermPolicyUtil,
        private readonly outboxService: OutboxService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly termPolicyQueue: TermPolicyQueue,
        private readonly helperDateService: HelperDateService,
        private readonly fileService: FileService
    ) {}

    private getContentByLanguage(
        contents: ITermPolicyContent[],
        language: EnumMessageLanguage
    ): ITermPolicyContent | null {
        return contents.find(c => c.language === language) ?? null;
    }

    private assertKeyPath({ type, version }: TermPolicy, key: string): void {
        const isInPath = this.termPolicyUtil.isContentKeyInPath(
            type,
            version,
            key
        );
        if (!isInPath) {
            throw new TermPolicyContentKeyInvalidException();
        }
    }

    async getDraftById(termPolicyId: string): Promise<TermPolicy> {
        const termPolicy =
            await this.termPolicyRepository.findOneById(termPolicyId);
        if (!termPolicy) {
            throw new TermPolicyNotFoundException();
        } else if (termPolicy.status !== EnumTermPolicyStatus.draft) {
            throw new TermPolicyStatusInvalidException();
        }

        return termPolicy;
    }

    /** Reads the uploaded object's size and first bytes and returns the verdicts with the content carrying the size S3 reports; throws `TermPolicyContentKeyInvalidException` for a missing object and `AwsS3NotConfiguredException` while S3 is unset; writes nothing. */
    async checkContent({
        language,
        key,
    }: ITermPolicyContentConfirm): Promise<ITermPolicyContentCheck> {
        try {
            const [aws, head]: [IAwsS3 | null, Buffer | null] =
                await Promise.all([
                    this.awsS3Service.checkItem(key, {
                        access: EnumAwsS3Accessibility.private,
                    }),
                    this.awsS3Service.getItemBytes(key, FileSniffSizeInBytes, {
                        access: EnumAwsS3Accessibility.private,
                    }),
                ]);
            if (!aws || !head) {
                throw new AwsS3NotConfiguredException();
            }

            const isSizeAllowed = this.termPolicyUtil.isContentSizeAllowed(
                aws.size
            );
            const isContentValid = await this.fileService.isContentOfExtension(
                head,
                EnumFileExtensionTemplate.hbs
            );

            return {
                isSizeAllowed,
                isContentValid,
                content: { language, ...aws },
            };
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            } else if (err instanceof NoSuchKey || err instanceof NotFound) {
                throw new TermPolicyContentKeyInvalidException();
            }

            throw new AppUnknownException(err);
        }
    }

    assertContentSizeAllowed(checks: ITermPolicyContentCheck[]): void {
        const isOversize = checks.some(({ isSizeAllowed }) => !isSizeAllowed);
        if (isOversize) {
            throw new TermPolicyContentSizeExceededException();
        }
    }

    assertContentTypeValid(checks: ITermPolicyContentCheck[]): void {
        const isInvalid = checks.some(({ isContentValid }) => !isContentValid);
        if (isInvalid) {
            throw new TermPolicyContentTypeInvalidException();
        }
    }

    /** Adds one delete row holding the keys of the refused objects only on the caller's transaction. */
    async deleteRejectedContentInTx(
        tx: IDatabaseTransactionClient,
        checks: ITermPolicyContentCheck[]
    ): Promise<void> {
        const keys = checks
            .filter(check => this.termPolicyUtil.isContentRejected([check]))
            .map(({ content }) => content.key);
        const effect = this.termPolicyQueue.deleteContentEffect(keys);
        await this.outboxService.addInTx(tx, effect);
    }

    async generateContentPresignByAdmin({
        language,
        size,
        type,
        version,
    }: ITermPolicyContentPresign): Promise<IAwsS3Presign> {
        const isSizeAllowed = this.termPolicyUtil.isContentSizeAllowed(size);
        if (!isSizeAllowed) {
            throw new TermPolicyContentSizeExceededException();
        }

        // Sequential by design: a cheap check before the expensive or external work it guards
        const status =
            await this.termPolicyRepository.findStatusByVersionAndType(
                version,
                type
            );
        if (status !== null && status !== EnumTermPolicyStatus.draft) {
            throw new TermPolicyStatusInvalidException();
        }

        const key: string = this.termPolicyUtil.getContentKey(
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
            throw new AwsS3NotConfiguredException();
        }

        return aws;
    }

    /** Returns the verdicts on the uploaded object beside the content; throws no size or content refusal, the caller deletes the refused object first. */
    async prepareUpdateContentByAdmin(
        termPolicyId: string,
        { key, language }: ITermPolicyContentConfirm
    ): Promise<ITermPolicyContentUploadPrepared<ITermPolicyContent>> {
        // Sequential by design: a cheap check before the expensive or external work it guards
        const termPolicy = await this.getDraftById(termPolicyId);
        this.assertKeyPath(termPolicy, key);
        const contents = this.termPolicyUtil.toContents(termPolicy.contents);
        if (contents instanceof TermPolicyContentInvalidException) {
            throw contents;
        }

        const existingContent = this.getContentByLanguage(contents, language);
        if (!existingContent) {
            throw new TermPolicyContentNotFoundException();
        }

        const isS3Initialized = this.awsS3Service.isInitialized();
        if (!isS3Initialized) {
            throw new AwsS3NotConfiguredException();
        }

        const check = await this.checkContent({ language, key });

        return {
            termPolicy,
            contents,
            existingContent,
            checks: [check],
        };
    }

    async updateContentByAdminInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        {
            termPolicy,
            contents,
            existingContent,
            checks: [{ content }],
        }: ITermPolicyContentUploadPrepared<ITermPolicyContent>
    ): Promise<void> {
        const updated = await this.termPolicyRepository.updateContentInTx(
            tx,
            termPolicy.id,
            contents,
            content,
            termPolicy.updatedAt
        );

        const effects: IOutboxEffect[] = [];
        if (existingContent.key !== content.key) {
            const deleteEffect = this.termPolicyQueue.deleteContentEffect([
                existingContent.key,
            ]);
            effects.push(deleteEffect);
        }

        const timestamp = this.helperDateService.now();
        const metadata = this.termPolicyUtil.mapActivityLogMetadata(
            updated,
            timestamp
        );
        const entry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            {
                action: EnumActivityLogAction.adminTermPolicyContentUpdated,
                metadata,
            }
        );
        effects.push(entry);
        await this.outboxService.addManyInTx(tx, effects);
    }

    /** Returns the verdicts on the uploaded object beside the content; throws no size or content refusal, the caller deletes the refused object first. */
    async prepareAddContentByAdmin(
        termPolicyId: string,
        { key, language }: ITermPolicyContentConfirm
    ): Promise<ITermPolicyContentUploadPrepared<null>> {
        // Sequential by design: a cheap check before the expensive or external work it guards
        const termPolicy = await this.getDraftById(termPolicyId);
        this.assertKeyPath(termPolicy, key);
        const contents = this.termPolicyUtil.toContents(termPolicy.contents);
        if (contents instanceof TermPolicyContentInvalidException) {
            throw contents;
        }

        const existingContent = this.getContentByLanguage(contents, language);
        if (existingContent) {
            throw new TermPolicyContentExistException();
        }

        const isS3Initialized = this.awsS3Service.isInitialized();
        if (!isS3Initialized) {
            throw new AwsS3NotConfiguredException();
        }

        const check = await this.checkContent({ language, key });

        return {
            termPolicy,
            contents,
            existingContent: null,
            checks: [check],
        };
    }

    async addContentByAdminInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        {
            termPolicy,
            checks: [{ content }],
        }: ITermPolicyContentUploadPrepared<null>
    ): Promise<void> {
        const added = await this.termPolicyRepository.addContentInTx(
            tx,
            termPolicy.id,
            content
        );

        const timestamp = this.helperDateService.now();
        const metadata = this.termPolicyUtil.mapActivityLogMetadata(
            added,
            timestamp
        );
        const entry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            {
                action: EnumActivityLogAction.adminTermPolicyContentAdded,
                metadata,
            }
        );
        await this.outboxService.addInTx(tx, entry);
    }

    async prepareRemoveContentByAdmin(
        termPolicyId: string,
        language: EnumMessageLanguage
    ): Promise<ITermPolicyContentPrepared<ITermPolicyContent>> {
        const termPolicy = await this.getDraftById(termPolicyId);
        const contents = this.termPolicyUtil.toContents(termPolicy.contents);
        if (contents instanceof TermPolicyContentInvalidException) {
            throw contents;
        }

        const existingContent = this.getContentByLanguage(contents, language);
        if (!existingContent) {
            throw new TermPolicyContentNotFoundException();
        }

        return { termPolicy, contents, existingContent };
    }

    async removeContentByAdminInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        {
            termPolicy,
            contents,
            existingContent,
        }: ITermPolicyContentPrepared<ITermPolicyContent>
    ): Promise<void> {
        const removed = await this.termPolicyRepository.removeContentInTx(
            tx,
            termPolicy.id,
            contents,
            existingContent.language,
            termPolicy.updatedAt
        );

        const deleteEffect = this.termPolicyQueue.deleteContentEffect([
            existingContent.key,
        ]);

        const timestamp = this.helperDateService.now();
        const metadata = this.termPolicyUtil.mapActivityLogMetadata(
            removed,
            timestamp
        );
        const entry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            {
                action: EnumActivityLogAction.adminTermPolicyContentRemoved,
                metadata,
            }
        );
        await this.outboxService.addManyInTx(tx, [deleteEffect, entry]);
    }

    async getContentByAdmin(
        termPolicyId: string,
        language: EnumMessageLanguage
    ): Promise<IAwsS3Presign> {
        const termPolicy =
            await this.termPolicyRepository.findOneById(termPolicyId);
        if (!termPolicy) {
            throw new TermPolicyNotFoundException();
        }
        const contents = this.termPolicyUtil.toContents(termPolicy.contents);
        if (contents instanceof TermPolicyContentInvalidException) {
            throw contents;
        }

        const existContent = this.getContentByLanguage(contents, language);
        if (!existContent) {
            throw new TermPolicyContentNotFoundException();
        }

        const awsPresign: IAwsS3Presign | null =
            await this.awsS3Service.presignGetItem(existContent.key, {
                access: existContent.access,
            });

        if (!awsPresign) {
            throw new AwsS3NotConfiguredException();
        }

        return awsPresign;
    }
}
