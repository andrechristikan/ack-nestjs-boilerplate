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
    private readonly uploadContentPath: string;
    private readonly contentPublicPath: string;
    private readonly contentMaxSizeInBytes: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService
    ) {
        this.uploadContentPath = this.configService.get<string>(
            'termPolicy.uploadContentPath'
        )!;
        this.contentPublicPath = this.configService.get<string>(
            'termPolicy.contentPublicPath'
        )!;
        this.contentMaxSizeInBytes = this.configService.get<number>(
            'termPolicy.content.maxSizeInBytes'
        )!;
    }

    isContentSizeAllowed(size: number): boolean {
        return size <= this.contentMaxSizeInBytes;
    }

    getPath(type: EnumTermPolicyType, version: number): string {
        return this.helperStringService.fillPattern(this.uploadContentPath, {
            type,
            version: version.toString(),
        });
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

    /** Builds the S3 key `{path}/{language}.{extension}` with the extension lowercased, dropping a leading slash. */
    getContentKey(
        type: EnumTermPolicyType,
        version: number,
        language: EnumMessageLanguage,
        { extension }: IFileRandomFilenameOptions
    ): string {
        const path: string = this.getPath(type, version);

        let fullPath: string = `${path}/${language}.${extension.toLowerCase()}`;
        if (fullPath.startsWith('/')) {
            fullPath = fullPath.replace('/', '');
        }

        return fullPath;
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
        return this.helperStringService.fillPattern(this.contentPublicPath, {
            type,
            version: version.toString(),
        });
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
