import type { IFileRandomFilenameOptions } from '@common/file/interfaces/file.interface';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import type { TermPolicyContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';
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
    }

    validateUniqueLanguages(contents: TermPolicyContentRequestDto[]): boolean {
        const languages = contents.map(content => content.language);
        const uniqueLanguages = this.helperArrayService.unique(languages);
        return uniqueLanguages.length === languages.length;
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

    getContentPublicPath(type: EnumTermPolicyType, version: number): string {
        return this.helperStringService.fillPattern(this.contentPublicPath, {
            type,
            version: version.toString(),
        });
    }

    mapActivityLogMetadata(
        termPolicy: Pick<TermPolicy, 'id' | 'type' | 'version'>,
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
        contents: TermPolicyContent[],
        language: EnumMessageLanguage
    ): TermPolicyContent | null {
        return contents.find(c => c.language === language) ?? null;
    }
}
