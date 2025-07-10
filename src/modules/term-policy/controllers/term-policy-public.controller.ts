import { ApiTags } from '@nestjs/swagger';
import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyGetResponseDto } from '@modules/term-policy/dtos/response/term-policy.get.response.dto';
import { IResponse } from '@common/response/interfaces/response.interface';
import { ENUM_TERM_POLICY_STATUS_CODE_ERROR } from '@modules/term-policy/enums/term-policy.status-code.enum';
import { TermPolicyGetRequestDto } from '@modules/term-policy/dtos/request/term-policy.get.request.dto';
import { TermPolicyListRequestDto } from '@modules/term-policy/dtos/request/term-policy.list.request.dto';
import { TermPolicyListResponseDto } from '@modules/term-policy/dtos/response/term-policy.list.response.dto';
import {
    TermPolicyPublicGetDoc,
    TermPolicyPublicListDoc,
} from '@modules/term-policy/docs/term-policy.public.doc';
import { Response } from '@common/response/decorators/response.decorator';
import { RequestCountry } from '@common/request/decorators/request.decorator';

@ApiTags('modules.public.term-policy')
@Controller({
    version: '1',
    path: '/term-policy',
})
export class TermPolicyPublicController {
    constructor(private readonly termPolicyService: TermPolicyService) {}

    @TermPolicyPublicListDoc()
    @Get('/:lang')
    @Response('termPolicy.list')
    async getList(
        @Param() request: TermPolicyListRequestDto,
        @RequestCountry() country: string
    ): Promise<IResponse<TermPolicyListResponseDto[]>> {
        // Get all different types of policies with their latest published versions for the specified language
        const policies = await this.termPolicyService.findAllByFilters({
            language: request.lang,
            country: country,
            latest: true,
            published: true,
        });

        return {
            data: this.termPolicyService.mapList(policies),
        };
    }

    @TermPolicyPublicGetDoc()
    @Get('/:lang/:type')
    @Response('termPolicy.get')
    async getLatest(
        @Param() request: TermPolicyGetRequestDto
    ): Promise<IResponse<TermPolicyGetResponseDto>> {
        const policy = await this.termPolicyService.findOne({
            type: request.type,
            language: request.lang,
            published: true,
            latest: true,
        });

        if (!policy) {
            throw new NotFoundException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'termPolicy.error.notFound',
            });
        }

        return {
            data: this.termPolicyService.mapGet(policy),
        };
    }
}
