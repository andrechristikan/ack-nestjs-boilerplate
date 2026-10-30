import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { AwsS3NotConfiguredException } from '@common/aws/exceptions/aws.s3-not-configured.exception';
import type { IAwsS3Presign } from '@common/aws/interfaces/aws.interface';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { EnumFileExtensionTemplate } from '@common/file/enums/file.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { TermPolicyContentExistException } from '@modules/term-policy/exceptions/term-policy.content-exist.exception';
import { TermPolicyContentInvalidException } from '@modules/term-policy/exceptions/term-policy.content-invalid.exception';
import { TermPolicyContentSizeExceededException } from '@modules/term-policy/exceptions/term-policy.content-size-exceeded.exception';
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
import { ConfigService } from '@nestjs/config';
import { EnumTermPolicyStatus } from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';

@Injectable()
export class TermPolicyContentDomain {
    private readonly contentMaxSizeInBytes: number;

    constructor(
        private readonly termPolicyRepository: TermPolicyRepository,
        private readonly awsS3Service: AwsS3Service,
        private readonly termPolicyUtil: TermPolicyUtil,
        private readonly configService: ConfigService
    ) {
        this.contentMaxSizeInBytes = this.configService.get<number>(
            'termPolicy.content.maxSizeInBytes'
        )!;
    }

    private async findOneDraftById(termPolicyId: string): Promise<TermPolicy> {
        const termPolicy =
            await this.termPolicyRepository.findOneById(termPolicyId);
        if (!termPolicy) {
            throw new TermPolicyNotFoundException();
        } else if (termPolicy.status !== EnumTermPolicyStatus.draft) {
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
        if (size > this.contentMaxSizeInBytes) {
            throw new TermPolicyContentSizeExceededException();
        }

        // Sequential by design: gate before the work it guards
        const status =
            await this.termPolicyRepository.findStatusByVersionAndType(
                version,
                type
            );
        if (status !== null && status !== EnumTermPolicyStatus.draft) {
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
            throw new AwsS3NotConfiguredException();
        }

        return aws;
    }

    async updateContentByAdmin(
        termPolicyId: string,
        { key, size, language }: ITermPolicyContentUpload
    ): Promise<TermPolicy> {
        const termPolicy = await this.findOneDraftById(termPolicyId);
        const contents = this.termPolicyUtil.toContents(termPolicy.contents);
        if (contents instanceof TermPolicyContentInvalidException) {
            throw contents;
        }

        const isS3Initialized = this.awsS3Service.isInitialized();
        if (!isS3Initialized) {
            throw new AwsS3NotConfiguredException();
        }

        try {
            const presign = this.awsS3Service.mapPresign(
                { key, size },
                {
                    access: EnumAwsS3Accessibility.private,
                }
            );
            const mappedContent: ITermPolicyContent = {
                language,
                ...presign,
            };
            const updated = await this.termPolicyRepository.updateContent(
                termPolicyId,
                contents,
                mappedContent
            );
            if (!updated) {
                throw new TermPolicyStatusInvalidException();
            }

            return termPolicy;
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
    ): Promise<TermPolicy> {
        const termPolicy = await this.findOneDraftById(termPolicyId);
        const contents = this.termPolicyUtil.toContents(termPolicy.contents);
        if (contents instanceof TermPolicyContentInvalidException) {
            throw contents;
        }

        const existingContent = this.termPolicyUtil.getContentByLanguage(
            contents,
            language
        );
        if (existingContent) {
            throw new TermPolicyContentExistException();
        }

        const isS3Initialized = this.awsS3Service.isInitialized();
        if (!isS3Initialized) {
            throw new AwsS3NotConfiguredException();
        }

        try {
            const presign = this.awsS3Service.mapPresign(
                { key, size },
                {
                    access: EnumAwsS3Accessibility.private,
                }
            );
            const mappedContent: ITermPolicyContent = {
                language,
                ...presign,
            };
            const added = await this.termPolicyRepository.addContent(
                termPolicyId,
                mappedContent
            );
            if (!added) {
                throw new TermPolicyStatusInvalidException();
            }

            return termPolicy;
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
    ): Promise<TermPolicy> {
        const termPolicy = await this.findOneDraftById(termPolicyId);
        const contents = this.termPolicyUtil.toContents(termPolicy.contents);
        if (contents instanceof TermPolicyContentInvalidException) {
            throw contents;
        }

        const existingContent = this.termPolicyUtil.getContentByLanguage(
            contents,
            language
        );
        if (!existingContent) {
            throw new TermPolicyContentNotFoundException();
        }

        try {
            const removed = await this.termPolicyRepository.removeContent(
                termPolicyId,
                contents,
                { language }
            );
            if (!removed) {
                throw new TermPolicyStatusInvalidException();
            }

            return termPolicy;
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
        const contents = this.termPolicyUtil.toContents(termPolicy.contents);
        if (contents instanceof TermPolicyContentInvalidException) {
            throw contents;
        }

        const existContent = this.termPolicyUtil.getContentByLanguage(
            contents,
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
            throw new AwsS3NotConfiguredException();
        }

        return awsPresign;
    }
}
