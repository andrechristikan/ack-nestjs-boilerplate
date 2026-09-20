import type { IAwsS3Presign } from '@common/aws/interfaces/aws.interface';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { TermPolicyContentPresignRequestDto } from '@modules/term-policy/dtos/request/term-policy.content-presign.request.dto';
import type { TermPolicyContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';
import type { TermPolicyRemoveContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.remove-content.request.dto';
import { TermPolicyContentDomain } from '@modules/term-policy/domains/term-policy.content.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TermPolicyContentHttpService {
    constructor(
        private readonly termPolicyContentDomain: TermPolicyContentDomain
    ) {}

    async generateContentPresignByAdmin(
        body: TermPolicyContentPresignRequestDto
    ): Promise<IResponseReturn<IAwsS3Presign>> {
        const presign =
            await this.termPolicyContentDomain.generateContentPresignByAdmin(
                body
            );

        return { data: presign };
    }

    async updateContentByAdmin(
        termPolicyId: string,
        body: TermPolicyContentRequestDto
    ): Promise<IResponseReturn<void>> {
        await this.termPolicyContentDomain.updateContentByAdmin(
            termPolicyId,
            body
        );

        return {};
    }

    async addContentByAdmin(
        termPolicyId: string,
        body: TermPolicyContentRequestDto
    ): Promise<IResponseReturn<void>> {
        await this.termPolicyContentDomain.addContentByAdmin(
            termPolicyId,
            body
        );

        return {};
    }

    async removeContentByAdmin(
        termPolicyId: string,
        { language }: TermPolicyRemoveContentRequestDto
    ): Promise<IResponseReturn<void>> {
        await this.termPolicyContentDomain.removeContentByAdmin(
            termPolicyId,
            language
        );

        return {};
    }

    async getContentByAdmin(
        termPolicyId: string,
        language: EnumMessageLanguage
    ): Promise<IResponseReturn<IAwsS3Presign>> {
        const presign = await this.termPolicyContentDomain.getContentByAdmin(
            termPolicyId,
            language
        );

        return { data: presign };
    }
}
