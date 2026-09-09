import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { AwsServiceUnavailableException } from '@common/aws/exceptions/aws.service-unavailable.exception';
import { IAwsS3Presign } from '@common/aws/interfaces/aws.interface';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { EnumFileExtensionTemplate } from '@common/file/enums/file.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { ActivityLogMetadataStoreKey } from '@modules/activity-log/constants/activity-log.constant';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { TermPolicyContentExistException } from '@modules/term-policy/exceptions/term-policy.content-exist.exception';
import { TermPolicyContentNotFoundException } from '@modules/term-policy/exceptions/term-policy.content-not-found.exception';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyStatusInvalidException } from '@modules/term-policy/exceptions/term-policy.status-invalid.exception';
import { ITermPolicyContentService } from '@modules/term-policy/interfaces/term-policy.content.service.interface';
import {
    ITermPolicy,
    ITermPolicyContentCreate,
    ITermPolicyContentPresign,
    ITermPolicyContentUpload,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { Injectable } from '@nestjs/common';
import { EnumTermPolicyStatus, TermPolicy } from '@generated/prisma-client';

@Injectable()
export class TermPolicyContentService implements ITermPolicyContentService {
    constructor(
        private readonly termPolicyRepository: TermPolicyRepository,
        private readonly awsS3Service: AwsS3Service,
        private readonly termPolicyUtil: TermPolicyUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    private storeActivityLogMetadata(termPolicy: TermPolicy): void {
        this.requestStoreService.merge<IActivityLogMetadata>(
            ActivityLogMetadataStoreKey,
            this.termPolicyUtil.mapActivityLogMetadata(termPolicy)
        );

        return;
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

        return aws;
    }

    async updateContentByAdmin(
        termPolicyId: string,
        { key, size, language }: ITermPolicyContentUpload,
        updatedBy: string
    ): Promise<void> {
        await this.findOneDraftById(termPolicyId);

        try {
            const mappedContent: ITermPolicyContentCreate = {
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
                mappedContent,
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

    async addContentByAdmin(
        termPolicyId: string,
        { key, size, language }: ITermPolicyContentUpload,
        updatedBy: string
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
            const mappedContent: ITermPolicyContentCreate = {
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

            this.storeActivityLogMetadata(updated);

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
        language: EnumMessageLanguage,
        updatedBy: string
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
            const updated = await this.termPolicyRepository.removeContent(
                termPolicyId,
                { language },
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
                access: EnumAwsS3Accessibility.private,
            });

        if (!awsPresign) {
            throw new AwsServiceUnavailableException();
        }

        return awsPresign;
    }
}
