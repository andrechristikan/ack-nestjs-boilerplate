import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { AwsServiceUnavailableException } from '@common/aws/exceptions/aws.service-unavailable.exception';
import type { IAwsS3Presign } from '@common/aws/interfaces/aws.interface';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumFileExtensionTemplate } from '@common/file/enums/file.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStagedEvent } from '@modules/activity-log/interfaces/activity-log.interface';
import { TermPolicyContentExistException } from '@modules/term-policy/exceptions/term-policy.content-exist.exception';
import { TermPolicyContentNotFoundException } from '@modules/term-policy/exceptions/term-policy.content-not-found.exception';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyStatusInvalidException } from '@modules/term-policy/exceptions/term-policy.status-invalid.exception';
import type {
    ITermPolicy,
    ITermPolicyContentCreate,
    ITermPolicyContentPresign,
    ITermPolicyContentUpload,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { Injectable } from '@nestjs/common';
import {
    EnumActivityLogAction,
    EnumTermPolicyStatus,
} from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';

@Injectable()
export class TermPolicyContentDomain {
    constructor(
        private readonly termPolicyRepository: TermPolicyRepository,
        private readonly awsS3Service: AwsS3Service,
        private readonly termPolicyUtil: TermPolicyUtil,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly helperDateService: HelperDateService
    ) {}

    private prepareActivityLog(
        action: EnumActivityLogAction,
        termPolicy: Pick<TermPolicy, 'id' | 'type' | 'version'>,
        timestamp: Date
    ): IActivityLogStagedEvent {
        const metadata = this.termPolicyUtil.mapActivityLogMetadata(
            termPolicy,
            timestamp
        );

        return this.activityLogDomain.prepare({
            action,
            metadata,
        });
    }

    private async findOneDraftById(termPolicyId: string): Promise<ITermPolicy> {
        const termPolicy =
            await this.termPolicyRepository.findOneById(termPolicyId);
        if (!termPolicy) {
            throw new TermPolicyNotFoundException();
        } else if (termPolicy.status === EnumTermPolicyStatus.published) {
            throw new TermPolicyStatusInvalidException();
        }

        return termPolicy;
    }

    async generateContentPresignByAdmin({
        language,
        size,
        type,
        version,
    }: ITermPolicyContentPresign): Promise<IAwsS3Presign> {
        const status =
            await this.termPolicyRepository.findStatusByVersionAndType(
                version,
                type
            );
        if (status === EnumTermPolicyStatus.published) {
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

        return aws;
    }

    async updateContentByAdmin(
        termPolicyId: string,
        { key, size, language }: ITermPolicyContentUpload
    ): Promise<void> {
        const termPolicy = await this.findOneDraftById(termPolicyId);

        try {
            const presign = this.awsS3Service.mapPresign(
                { key, size },
                { access: EnumAwsS3Accessibility.private }
            );
            const mappedContent: ITermPolicyContentCreate = {
                language,
                ...presign,
            };
            const timestamp = this.helperDateService.create();
            const events = [
                this.prepareActivityLog(
                    EnumActivityLogAction.adminTermPolicyUpdateContent,
                    termPolicy,
                    timestamp
                ),
            ];
            await this.termPolicyRepository.updateContent(
                termPolicyId,
                mappedContent
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

    async addContentByAdmin(
        termPolicyId: string,
        { key, size, language }: ITermPolicyContentUpload
    ): Promise<void> {
        const termPolicy = await this.findOneDraftById(termPolicyId);

        const existingContent = this.termPolicyUtil.getContentByLanguage(
            termPolicy.contents,
            language
        );
        if (existingContent) {
            throw new TermPolicyContentExistException();
        }

        try {
            const presign = this.awsS3Service.mapPresign(
                { key, size },
                { access: EnumAwsS3Accessibility.private }
            );
            const mappedContent: ITermPolicyContentCreate = {
                language,
                ...presign,
            };
            const timestamp = this.helperDateService.create();
            const events = [
                this.prepareActivityLog(
                    EnumActivityLogAction.adminTermPolicyAddContent,
                    termPolicy,
                    timestamp
                ),
            ];
            await this.termPolicyRepository.addContent(
                termPolicyId,
                mappedContent
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

    async removeContentByAdmin(
        termPolicyId: string,
        language: EnumMessageLanguage
    ): Promise<void> {
        const termPolicy = await this.findOneDraftById(termPolicyId);

        const existingContent = this.termPolicyUtil.getContentByLanguage(
            termPolicy.contents,
            language
        );
        if (!existingContent) {
            throw new TermPolicyContentNotFoundException();
        }

        try {
            const timestamp = this.helperDateService.create();
            const events = [
                this.prepareActivityLog(
                    EnumActivityLogAction.adminTermPolicyRemoveContent,
                    termPolicy,
                    timestamp
                ),
            ];
            await this.termPolicyRepository.removeContent(termPolicyId, {
                language,
            });

            this.activityLogDomain.stagePrepared(events);

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
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

        const existContent = this.termPolicyUtil.getContentByLanguage(
            termPolicy.contents,
            language
        );
        if (!existContent) {
            throw new TermPolicyContentNotFoundException();
        }

        const awsPresign: IAwsS3Presign | null =
            await this.awsS3Service.presignGetItem(existContent.key, {
                access: existContent.access as EnumAwsS3Accessibility,
            });

        if (!awsPresign) {
            throw new AwsServiceUnavailableException();
        }

        return awsPresign;
    }
}
