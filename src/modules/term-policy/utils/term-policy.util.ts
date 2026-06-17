import { IAwsS3 } from '@common/aws/interfaces/aws.interface';
import { IFileRandomFilenameOptions } from '@common/file/interfaces/file.interface';
import { FileService } from '@common/file/services/file.service';
import { HelperService } from '@common/helper/services/helper.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { ResponseUtil } from '@common/response/utils/response.util';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { TermPolicyContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';
import { TermPolicyResponseDto } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import { TermPolicyUserAcceptanceResponseDto } from '@modules/term-policy/dtos/response/term-policy.user-acceptance.response.dto';
import { TermContentDto } from '@modules/term-policy/dtos/term-policy.content.dto';
import { ITermPolicyUserAcceptance } from '@modules/term-policy/interfaces/term-policy.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    EnumTermPolicyType,
    Prisma,
    TermPolicy,
} from '@generated/prisma-client';

@Injectable()
export class TermPolicyUtil {
    private readonly uploadContentPath: string;
    private readonly contentPublicPath: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperService: HelperService,
        private readonly fileService: FileService,
        private readonly responseUtil: ResponseUtil
    ) {
        this.uploadContentPath = this.configService.get<string>(
            'termPolicy.uploadContentPath'
        )!;
        this.contentPublicPath = this.configService.get<string>(
            'termPolicy.contentPublicPath'
        )!;
    }

    mapList(termPolicies: TermPolicy[]): TermPolicyResponseDto[] {
        return this.responseUtil.serialize(
            TermPolicyResponseDto,
            termPolicies
        );
    }

    mapOne(termPolicy: TermPolicy): TermPolicyResponseDto {
        return this.responseUtil.serialize(TermPolicyResponseDto, termPolicy);
    }

    mapListUserAccepted(
        termPolicyUserAcceptances: ITermPolicyUserAcceptance[]
    ): TermPolicyUserAcceptanceResponseDto[] {
        return this.responseUtil.serialize(
            TermPolicyUserAcceptanceResponseDto,
            termPolicyUserAcceptances
        );
    }

    validateUniqueLanguages(contents: TermPolicyContentRequestDto[]): boolean {
        const languages = contents.map(content => content.language);
        const uniqueLanguages = this.helperService.arrayUnique(languages);
        return uniqueLanguages.length === languages.length;
    }

    getPath(termPolicy: TermPolicy): string {
        return this.uploadContentPath
            .replace('{type}', termPolicy.type)
            .replace('{version}', termPolicy.version.toString());
    }

    /** Builds the private S3 key `{path}/{language}.{ext}`, stripping any leading slash. */
    createRandomFilenameContentWithPath(
        type: EnumTermPolicyType,
        version: number,
        language: EnumMessageLanguage,
        { extension }: IFileRandomFilenameOptions
    ): string {
        const path: string = this.uploadContentPath
            .replace('{type}', type)
            .replace('{version}', version.toString());

        let fullPath: string = `${path}/${language}.${extension.toLowerCase()}`;
        if (fullPath.startsWith('/')) {
            fullPath = fullPath.replace('/', '');
        }

        return fullPath;
    }

    checkContentExist(
        contents: Prisma.JsonArray,
        language: EnumMessageLanguage
    ): boolean {
        return !!(contents as unknown as TermContentDto[]).find(
            c => c.language === language
        );
    }

    getContentPublicPath(termPolicy: TermPolicy): string {
        return this.contentPublicPath
            .replace('{type}', termPolicy.type)
            .replace('{version}', termPolicy.version.toString());
    }

    /** Re-attaches each content language to its moved S3 item by matching filenames. */
    mapPublicContent(
        newItems: IAwsS3[],
        contents: TermContentDto[]
    ): TermContentDto[] {
        return newItems.map(item => {
            const language = contents.find(
                c =>
                    this.fileService.extractFilenameFromPath(c.key) ===
                    this.fileService.extractFilenameFromPath(item.key)
            )?.language as EnumMessageLanguage;

            return { ...item, language };
        });
    }

    mapActivityLogMetadata(termPolicy: TermPolicy): IActivityLogMetadata {
        return {
            termPolicyId: termPolicy.id,
            termPolicyType: termPolicy.type,
            termPolicyVersion: termPolicy.version,
            timestamp: termPolicy.updatedAt ?? termPolicy.createdAt,
        };
    }

    getContentByLanguage(
        contents: TermContentDto[],
        language: EnumMessageLanguage
    ): TermContentDto | null {
        return contents.find(c => c.language === language) ?? null;
    }
}
