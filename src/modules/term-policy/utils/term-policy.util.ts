import type { IFileRandomFilenameOptions } from '@common/file/interfaces/file.interface';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import type { IAnalyticTermPolicyTimeToAccept } from '@modules/analytic/interfaces/analytic.interface';
import { TermPolicyContentInvalidException } from '@modules/term-policy/exceptions/term-policy.content-invalid.exception';
import type { TermPolicyContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';
import type {
    ITermPolicyAcceptanceAnalytic,
    ITermPolicyActivityLogSubject,
    ITermPolicyContent,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import type {
    TermPolicy,
    TermPolicyContent,
} from '@generated/prisma-client/client';

@Injectable()
export class TermPolicyUtil {
    private readonly uploadContentPath: string;
    private readonly contentPublicPath: string;
    private readonly contentMaxSizeInBytes: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperArrayService: HelperArrayService,
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

    validateUniqueLanguages(contents: TermPolicyContentRequestDto[]): boolean {
        const languages = contents.map(content => content.language);
        const uniqueLanguages = this.helperArrayService.unique(languages);
        return uniqueLanguages.length === languages.length;
    }

    /** True when the size is within `termPolicy.content.maxSizeInBytes`. */
    isContentSizeAllowed(size: number): boolean {
        return size <= this.contentMaxSizeInBytes;
    }

    getPath(termPolicy: TermPolicy): string {
        return this.helperStringService.fillPattern(this.uploadContentPath, {
            type: termPolicy.type,
            version: termPolicy.version.toString(),
        });
    }

    /** Builds the private S3 key `{path}/{language}.{ext}`, stripping any leading slash. */
    createRandomFilenameContentWithPath(
        type: EnumTermPolicyType,
        version: number,
        language: EnumMessageLanguage,
        { extension }: IFileRandomFilenameOptions
    ): string {
        const path: string = this.helperStringService.fillPattern(
            this.uploadContentPath,
            { type, version: version.toString() }
        );

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
            const access =
                Object.values(EnumAwsS3Accessibility).find(
                    value => value === content.access
                ) ?? null;
            if (language === null || access === null) {
                return new TermPolicyContentInvalidException();
            }

            mapped.push({ ...content, language, access });
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

    getContentByLanguage(
        contents: ITermPolicyContent[],
        language: EnumMessageLanguage
    ): ITermPolicyContent | null {
        return contents.find(c => c.language === language) ?? null;
    }

    averageAcceptanceMs(
        rows: ITermPolicyAcceptanceAnalytic[]
    ): IAnalyticTermPolicyTimeToAccept {
        const deltas = rows.flatMap(row =>
            row.publishedAt === null
                ? []
                : [row.acceptedAt.getTime() - row.publishedAt.getTime()]
        );
        if (deltas.length === 0) {
            return { count: 0, averageMs: 0 };
        }

        const averageMs = deltas.reduce((s, d) => s + d, 0) / deltas.length;

        return { count: deltas.length, averageMs };
    }
}
