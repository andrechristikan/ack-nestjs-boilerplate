import { AwsS3Dto } from '@common/aws/dtos/aws.s3.dto';
import { IFileRandomFilenameOptions } from '@common/file/interfaces/file.interface';
import { FileService } from '@common/file/services/file.service';
import { HelperService } from '@common/helper/services/helper.service';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { TermPolicyContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';
import { TermPolicyResponseDto } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import { TermPolicyUserAcceptanceResponseDto } from '@modules/term-policy/dtos/response/term-policy.user-acceptance.response.dto';
import { TermContentDto } from '@modules/term-policy/dtos/term-policy.content.dto';
import { ITermPolicyUserAcceptance } from '@modules/term-policy/interfaces/term-policy.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENUM_TERM_POLICY_TYPE, Prisma, TermPolicy } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class TermPolicyUtil {
    private readonly uploadContentPath: string;
    private readonly contentPublicPath: string;
    private readonly filenamePattern: string;

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
        this.filenamePattern = this.configService.get<string>(
            'termPolicy.filenamePattern'
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

    createRandomFilenameContentWithPath(
        type: ENUM_TERM_POLICY_TYPE,
        version: number,
        language: ENUM_MESSAGE_LANGUAGE,
        { extension }: IFileRandomFilenameOptions
    ): string {
        const path: string = this.uploadContentPath.replace('{type}', type);
        const filenamePrefix = this.filenamePattern
            .replace('{version}', version.toString())
            .replace('{language}', language);
        return this.fileService.createRandomFilename({
            path,
            prefix: filenamePrefix,
            extension,
            randomLength: 20,
        });
    }

    checkContentExist(
        contents: Prisma.JsonArray,
        language: ENUM_MESSAGE_LANGUAGE
    ): boolean {
        return !!(contents as unknown as TermContentDto[]).find(
            c => c.language === language
        );
    }

    getContentPublicPath(type: ENUM_TERM_POLICY_TYPE): string {
        return this.contentPublicPath.replace('{type}', type);
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
            )?.language as ENUM_MESSAGE_LANGUAGE;

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
}
