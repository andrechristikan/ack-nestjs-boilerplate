import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { EnumAwsS3Accessibility } from '@generated/prisma-client/client';
import { AwsS3NotConfiguredException } from '@common/aws/exceptions/aws.s3-not-configured.exception';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { AwsSesNotConfiguredException } from '@common/aws/exceptions/aws.ses-not-configured.exception';
import { AwsSesService } from '@common/aws/services/aws.ses.service';
import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { TermPolicyContentEmptyException } from '@modules/term-policy/exceptions/term-policy.content-empty.exception';
import { TermPolicyContentSizeExceededException } from '@modules/term-policy/exceptions/term-policy.content-size-exceeded.exception';
import { TermPolicyContentInvalidException } from '@modules/term-policy/exceptions/term-policy.content-invalid.exception';
import { TermPolicyContentKeyInvalidException } from '@modules/term-policy/exceptions/term-policy.content-key-invalid.exception';
import { TermPolicyExistException } from '@modules/term-policy/exceptions/term-policy.exist.exception';
import { TermPolicyLanguageDuplicateException } from '@modules/term-policy/exceptions/term-policy.language-duplicate.exception';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyStatusInvalidException } from '@modules/term-policy/exceptions/term-policy.status-invalid.exception';
import type { TermPolicyContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';
import type {
    ITermPolicyContent,
    ITermPolicyContentUpload,
    ITermPolicyCreate,
    ITermPolicyCreatePrepared,
    ITermPolicyPublishPrepared,
    ITermPolicyRef,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyContentService } from '@modules/term-policy/services/term-policy.content.service';
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
export class TermPolicyService {
    constructor(
        private readonly termPolicyRepository: TermPolicyRepository,
        private readonly awsS3Service: AwsS3Service,
        private readonly awsSesService: AwsSesService,
        private readonly termPolicyUtil: TermPolicyUtil,
        private readonly helperArrayService: HelperArrayService,
        private readonly outboxService: OutboxService,
        private readonly helperDateService: HelperDateService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly termPolicyQueue: TermPolicyQueue,
        private readonly termPolicyContentService: TermPolicyContentService
    ) {}

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

    assertEmailDeliverable(): void {
        const isSesInitialized = this.awsSesService.isInitialized();
        if (!isSesInitialized) {
            throw new AwsSesNotConfiguredException();
        }
    }

    async getListByAdmin(
        pagination: IPaginationQueryOffsetParams,
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
        pagination: IPaginationQueryCursorParams,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePaginationReturn<TermPolicy>> {
        return this.termPolicyRepository.findPublished(
            pagination,
            type ?? null
        );
    }

    async prepareCreateByAdmin({
        contents,
        type,
        version,
    }: ITermPolicyCreate): Promise<ITermPolicyCreatePrepared> {
        // Sequential by design: a cheap check before the expensive or external work it guards
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

        await Promise.all(
            contents.map(({ key }) =>
                this.termPolicyContentService.assertContentText(key)
            )
        );

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

        return { contents: mappedContents };
    }

    async createByAdminInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        termPolicyId: string,
        { type, version }: ITermPolicyCreate,
        contents: ITermPolicyContent[]
    ): Promise<TermPolicy> {
        const created = await this.termPolicyRepository.createInTx(
            tx,
            termPolicyId,
            type,
            version,
            contents
        );

        const timestamp = this.helperDateService.create();
        const metadata = this.termPolicyUtil.mapActivityLogMetadata(
            { id: termPolicyId, type, version },
            timestamp
        );
        const entry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.adminTermPolicyCreated,
                metadata,
            }
        );
        await this.outboxService.addInTx(tx, entry);

        return created;
    }

    async deleteContentKeys(keys: string[]): Promise<void> {
        await this.awsS3Service.deleteItems(keys, {
            access: EnumAwsS3Accessibility.private,
        });
    }

    async deleteByAdminInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        termPolicy: TermPolicy
    ): Promise<void> {
        const isDeleted = await this.termPolicyRepository.deleteDraftInTx(
            tx,
            termPolicy.id
        );
        if (!isDeleted) {
            throw new TermPolicyStatusInvalidException();
        }

        const effects: IOutboxEffect[] = [];
        const contentKeys = termPolicy.contents.map(content => content.key);
        if (contentKeys.length > 0) {
            const deleteEffect =
                this.termPolicyQueue.deleteContentEffect(contentKeys);
            effects.push(deleteEffect);
        }

        const timestamp = this.helperDateService.create();
        const metadata = this.termPolicyUtil.mapActivityLogMetadata(
            termPolicy,
            timestamp
        );
        const entry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.adminTermPolicyDeleted,
                metadata,
            }
        );
        effects.push(entry);
        await this.outboxService.addManyInTx(tx, effects);
    }

    async preparePublishByAdmin(
        termPolicyId: string
    ): Promise<ITermPolicyPublishPrepared> {
        // Sequential by design: a cheap check before the expensive or external work it guards
        const termPolicy =
            await this.termPolicyContentService.getDraftById(termPolicyId);

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

        const hasNewerPublished =
            await this.termPolicyRepository.existsNewerPublished(
                termPolicy.type,
                termPolicy.version
            );
        if (hasNewerPublished) {
            throw new TermPolicyStatusInvalidException();
        }

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

        await this.awsS3Service.copyItems(contents, destination, {
            access: EnumAwsS3Accessibility.public,
        });

        return { termPolicy, publicContents };
    }

    async publishByAdminInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        { termPolicy, publicContents }: ITermPolicyPublishPrepared
    ): Promise<TermPolicy> {
        const isPublished = await this.termPolicyRepository.publishInTx(
            tx,
            termPolicy.id,
            publicContents
        );
        if (!isPublished) {
            throw new TermPolicyStatusInvalidException();
        }

        const row = await this.termPolicyRepository.findOneByIdInTx(
            tx,
            termPolicy.id
        );
        if (!row) {
            throw new TermPolicyNotFoundException();
        }

        await this.termPolicyRepository.archivePublishedByTypeInTx(
            tx,
            row.type,
            row.version
        );

        const recipientCutoffAt = this.helperDateService.formatToIso(
            row.publishedAt!
        );
        const publishEffect = this.termPolicyQueue.publishEffect(
            {
                termPolicyId: termPolicy.id,
                type: row.type,
                version: row.version,
                recipientCutoffAt,
                resendNonce: null,
            },
            authContext.userId
        );

        const metadata = this.termPolicyUtil.mapActivityLogMetadata(
            row,
            row.updatedAt
        );
        const entry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.adminTermPolicyPublished,
                metadata,
            }
        );
        await this.outboxService.addManyInTx(tx, [publishEffect, entry]);

        return row;
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
