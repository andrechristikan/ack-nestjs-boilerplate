import { AwsS3Dto } from '@common/aws/dtos/aws.s3.dto';
import { IFileRandomFilenameOptions } from '@common/file/interfaces/file.interface';
import { FileService } from '@common/file/services/file.service';
import { HelperService } from '@common/helper/services/helper.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { TermPolicyContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';
import { TermPolicyResponseDto } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import { TermPolicyUserAcceptanceResponseDto } from '@modules/term-policy/dtos/response/term-policy.user-acceptance.response.dto';
import { TermContentDto } from '@modules/term-policy/dtos/term-policy.content.dto';
import { ITermPolicyUserAcceptance } from '@modules/term-policy/interfaces/term-policy.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnumTermPolicyType, Prisma, TermPolicy } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class TermPolicyUtil {
    private readonly uploadContentPath: string;
    private readonly contentPublicPath: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperService: HelperService,
        private readonly fileService: FileService
    ) {
        this.uploadContentPath = this.configService.get<string>(
            'termPolicy.uploadContentPath'
        );
        this.contentPublicPath = this.configService.get<string>(
            'termPolicy.contentPublicPath'
        );
    }

    mapList(termPolicies: TermPolicy[]): TermPolicyResponseDto[] {
        return plainToInstance(TermPolicyResponseDto, termPolicies);
    }

    mapOne(termPolicy: TermPolicy): TermPolicyResponseDto {
        return plainToInstance(TermPolicyResponseDto, termPolicy);
    }

    mapListUserAccepted(
        termPolicyUserAcceptances: ITermPolicyUserAcceptance[]
    ): TermPolicyUserAcceptanceResponseDto[] {
        return plainToInstance(
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

    createRandomFilenameContentWithPath(
        type: EnumTermPolicyType,
        version: number,
        language: EnumMessageLanguage,
        { extension }: IFileRandomFilenameOptions
    ): string {
        const path: string = this.uploadContentPath
            .replace('{type}', type)
            .replace('{version}', version.toString());
        return this.fileService.createRandomFilename({
            path,
            prefix: language,
            extension,
            randomLength: 20,
        });
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

    mapPublicContent(
        newItems: AwsS3Dto[],
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
        const content = contents.find(c => c.language === language);
        return content || null;
    }
}
