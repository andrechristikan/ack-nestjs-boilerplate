import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { AwsServiceUnavailableException } from '@common/aws/exceptions/aws.service-unavailable.exception';
import type { IAwsS3Presign } from '@common/aws/interfaces/aws.interface';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { EnumFileExtensionTemplate } from '@common/file/enums/file.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { TermPolicyContentExistException } from '@modules/term-policy/exceptions/term-policy.content-exist.exception';
import { TermPolicyContentNotFoundException } from '@modules/term-policy/exceptions/term-policy.content-not-found.exception';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyStatusInvalidException } from '@modules/term-policy/exceptions/term-policy.status-invalid.exception';
import type {
    ITermPolicyContent,
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
        private readonly activityLogDomain: ActivityLogDomain
    ) {}

    private stageActivityLog(
        action: EnumActivityLogAction,
        termPolicy: TermPolicy
    ): void {
        this.activityLogDomain.stage({
            action,
            metadata: this.termPolicyUtil.mapActivityLogMetadata(termPolicy),
        });
    }

    private async findOneDraftById(termPolicyId: string): Promise<TermPolicy> {
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
            const mappedContent: ITermPolicyContent = {
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
                termPolicy.contents as unknown as ITermPolicyContent[],
                mappedContent
            );

            this.stageActivityLog(
                EnumActivityLogAction.adminTermPolicyUpdateContent,
                updated
            );

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
            termPolicy.contents as unknown as ITermPolicyContent[],
            language
        );
        if (existingContent) {
            throw new TermPolicyContentExistException();
        }

        try {
            const mappedContent: ITermPolicyContent = {
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
                mappedContent
            );

            this.stageActivityLog(
                EnumActivityLogAction.adminTermPolicyAddContent,
                updated
            );

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
            termPolicy.contents as unknown as ITermPolicyContent[],
            language
        );
        if (!existingContent) {
            throw new TermPolicyContentNotFoundException();
        }

        try {
            const updated = await this.termPolicyRepository.removeContent(
                termPolicyId,
                termPolicy.contents as unknown as ITermPolicyContent[],
                { language }
            );

            this.stageActivityLog(
                EnumActivityLogAction.adminTermPolicyRemoveContent,
                updated
            );

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
            termPolicy.contents as unknown as ITermPolicyContent[],
            language
        );
        if (!existContent) {
            throw new TermPolicyContentNotFoundException();
        }

        const awsPresign: IAwsS3Presign | null =
            await this.awsS3Service.presignGetItem(existContent.key, {
                access: existContent.access,
            });

        if (!awsPresign) {
            throw new AwsServiceUnavailableException();
        }

        return awsPresign;
    }
}
