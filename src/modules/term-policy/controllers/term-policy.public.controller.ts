import type { TermPolicyPublicListRequestDto } from '@modules/term-policy/dtos/request/term-policy.public-list.request.dto';
import { TermPolicyPublicListRequestSchema } from '@modules/term-policy/dtos/request/term-policy.public-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import { ResponsePagination } from '@common/response/decorators/response.decorator';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { TermPolicyResponseSchema } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import { TermPolicyHttpService } from '@modules/term-policy/services/term-policy.http.service';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { TermPolicy } from '@generated/prisma-client/client';

@ApiTags('modules.public.termPolicy')
@Controller({
    version: '1',
    path: '/term-policy',
})
export class TermPolicyPublicController {
    constructor(
        private readonly termPolicyHttpService: TermPolicyHttpService
    ) {}

    @Doc({ summary: 'Retrieve list of publish terms and policies' })
    @ResponsePagination('termPolicy.list', {
        schema: TermPolicyResponseSchema,
    })
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @Query({ schema: TermPolicyPublicListRequestSchema })
        query: TermPolicyPublicListRequestDto
    ): Promise<IResponsePaginationReturn<TermPolicy>> {
        return this.termPolicyHttpService.getListPublished(query);
    }
}
