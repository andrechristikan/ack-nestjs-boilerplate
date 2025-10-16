import { ENUM_FILE_EXTENSION_DOCUMENT } from '@common/file/enums/file.enum';
import { TermPolicyResponseDto } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import { TermPolicyUserAcceptanceResponseDto } from '@modules/term-policy/dtos/response/term-policy.user-acceptance.response.dto';
import { ITermPolicyUserAcceptance } from '@modules/term-policy/interfaces/term-policy.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENUM_TERM_POLICY_TYPE, TermPolicy } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class TermPolicyUtil {
    private readonly uploadPath: string;
    private readonly filePattern: string;

    constructor(private readonly configService: ConfigService) {
        this.uploadPath = this.configService.get<string>(
            'termPolicy.uploadPath'
        );
        this.filePattern = this.configService.get<string>(
            'termPolicy.filePattern'
        );
    }

    createDocumentFilename(
        type: ENUM_TERM_POLICY_TYPE,
        language: string,
        extension: ENUM_FILE_EXTENSION_DOCUMENT,
        version: number
    ): string {
        const path = `${this.uploadPath}/${this.filePattern
            .replace('{type}', type)
            .replace('{version}', version.toString())
            .replace('{language}', language)}`;

        return `${path}.${extension}`.toLowerCase();
    }

    mapList(termPolicies: TermPolicy[]): TermPolicyResponseDto[] {
        return plainToInstance(TermPolicyResponseDto, termPolicies);
    }

    mapListUserAccepted(
        termPolicyUserAcceptances: ITermPolicyUserAcceptance[]
    ): TermPolicyUserAcceptanceResponseDto[] {
        return plainToInstance(
            TermPolicyUserAcceptanceResponseDto,
            termPolicyUserAcceptances
        );
    }
}
