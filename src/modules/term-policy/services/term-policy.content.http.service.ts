import { AwsS3PresignResponseDto } from '@common/aws/dtos/response/aws.s3-presign.response.dto';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { TermPolicyContentPresignRequestDto } from '@modules/term-policy/dtos/request/term-policy.content-presign.request.dto';
import { TermPolicyContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';
import { TermPolicyRemoveContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.remove-content.request.dto';
import { ITermPolicyContentHttpService } from '@modules/term-policy/interfaces/term-policy.content.http.service.interface';
import { TermPolicyContentService } from '@modules/term-policy/services/term-policy.content.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TermPolicyContentHttpService implements ITermPolicyContentHttpService {
    constructor(
        private readonly termPolicyContentService: TermPolicyContentService
    ) {}

    async generateContentPresignByAdmin(
        body: TermPolicyContentPresignRequestDto
    ): Promise<IResponseReturn<AwsS3PresignResponseDto>> {
        const presign =
            await this.termPolicyContentService.generateContentPresignByAdmin(
                body
            );

        return { data: presign };
    }

    async updateContentByAdmin(
        termPolicyId: string,
        body: TermPolicyContentRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        await this.termPolicyContentService.updateContentByAdmin(
            termPolicyId,
            body,
            updatedBy
        );

        return {};
    }

    async addContentByAdmin(
        termPolicyId: string,
        body: TermPolicyContentRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        await this.termPolicyContentService.addContentByAdmin(
            termPolicyId,
            body,
            updatedBy
        );

        return {};
    }

    async removeContentByAdmin(
        termPolicyId: string,
        { language }: TermPolicyRemoveContentRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        await this.termPolicyContentService.removeContentByAdmin(
            termPolicyId,
            language,
            updatedBy
        );

        return {};
    }

    async getContentByAdmin(
        termPolicyId: string,
        language: EnumMessageLanguage
    ): Promise<IResponseReturn<AwsS3PresignResponseDto>> {
        const presign = await this.termPolicyContentService.getContentByAdmin(
            termPolicyId,
            language
        );

        return { data: presign };
    }
}
