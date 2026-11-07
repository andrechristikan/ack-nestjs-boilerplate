import type { TermPolicyPublicListRequestDto } from '@modules/term-policy/dtos/request/term-policy.public-list.request.dto';
import { TermPolicyPublicListRequestSchema } from '@modules/term-policy/dtos/request/term-policy.public-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import { ResponsePagination } from '@common/response/decorators/response.decorator';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { TermPolicyResponseSchema } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import { TermPolicyGetListPublishedUseCase } from '@modules/term-policy/use-cases/term-policy.get-list-published.use-case';
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
        private readonly termPolicyGetListPublishedUseCase: TermPolicyGetListPublishedUseCase
    ) {}

    @Doc({ summary: 'retrieve list of publish terms and policies' })
    @ResponsePagination('termPolicy.list', {
        schema: TermPolicyResponseSchema,
    })
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @Query({ schema: TermPolicyPublicListRequestSchema })
        query: TermPolicyPublicListRequestDto
    ): Promise<IResponsePaginationReturn<TermPolicy>> {
        return this.termPolicyGetListPublishedUseCase.execute(query);
    }
}
