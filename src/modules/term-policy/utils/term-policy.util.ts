import type { IFileRandomFilenameOptions } from '@common/file/interfaces/file.interface';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { TermPolicyContentInvalidException } from '@modules/term-policy/exceptions/term-policy.content-invalid.exception';
import type {
    ITermPolicyActivityLogSubject,
    ITermPolicyContent,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import type { TermPolicyContent } from '@generated/prisma-client/client';

@Injectable()
export class TermPolicyUtil {
    private readonly uploadContentPathPattern: string;
    private readonly contentPublicPathPattern: string;
    private readonly maxSizeInBytes: number;
    private readonly contentKeyRandomLength: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService
    ) {
        this.uploadContentPathPattern = this.configService.get<string>(
            'termPolicy.uploadContentPathPattern'
        )!;
        this.contentPublicPathPattern = this.configService.get<string>(
            'termPolicy.contentPublicPathPattern'
        )!;
        this.maxSizeInBytes = this.configService.get<number>(
            'termPolicy.content.maxSizeInBytes'
        )!;
        this.contentKeyRandomLength = this.configService.get<number>(
            'termPolicy.contentKeyRandomLength'
        )!;
    }

    private getPath(type: EnumTermPolicyType, version: number): string {
        return this.helperStringService.fillPattern(
            this.uploadContentPathPattern,
            {
                type,
                version: version.toString(),
            }
        );
    }

    isContentSizeAllowed(size: number): boolean {
        return size <= this.maxSizeInBytes;
    }

    isContentKeyInPath(
        type: EnumTermPolicyType,
        version: number,
        key: string
    ): boolean {
        const path = this.getPath(type, version);
        const prefix = `${path}/`;

        return key.startsWith(prefix) && key.length > prefix.length;
    }

    /** Builds the S3 key `{path}/{language}-{random}.{extension}` with the extension lowercased, dropping every leading slash. */
    getContentKey(
        type: EnumTermPolicyType,
        version: number,
        language: EnumMessageLanguage,
        { extension }: IFileRandomFilenameOptions
    ): string {
        const path: string = this.getPath(type, version);

        const random: string = this.helperStringService.random(
            this.contentKeyRandomLength
        );

        return this.helperStringService.stripLeadingSlashes(
            `${path}/${language}-${random}.${extension.toLowerCase()}`
        );
    }

    toContents(
        contents: TermPolicyContent[]
    ): ITermPolicyContent[] | TermPolicyContentInvalidException {
        const mapped: ITermPolicyContent[] = [];
        for (const content of contents) {
            const language =
                Object.values(EnumMessageLanguage).find(
                    value => value === content.language
                ) ?? null;
            if (language === null) {
                return new TermPolicyContentInvalidException();
            }

            mapped.push({ ...content, language });
        }

        return mapped;
    }

    getContentPublicPath(type: EnumTermPolicyType, version: number): string {
        return this.helperStringService.fillPattern(
            this.contentPublicPathPattern,
            {
                type,
                version: version.toString(),
            }
        );
    }

    mapActivityLogMetadata(
        termPolicy: ITermPolicyActivityLogSubject,
        timestamp: Date
    ): IActivityLogMetadata {
        return {
            termPolicyId: termPolicy.id,
            termPolicyType: termPolicy.type,
            termPolicyVersion: termPolicy.version,
            timestamp,
        };
    }
}
