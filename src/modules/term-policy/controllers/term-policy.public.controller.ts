import {
    PaginationCursorQuery,
    PaginationQueryFilterInEnum,
} from '@common/pagination/decorators/pagination.decorator';
import {
    IPaginationIn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import { ResponsePaging } from '@common/response/decorators/response.decorator';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    TermPolicyDefaultAvailableOrderBy,
    TermPolicyDefaultType,
} from '@modules/term-policy/constants/term-policy.list.constant';
import { TermPolicyPublicListDoc } from '@modules/term-policy/docs/term-policy.public.doc';
import { TermPolicyResponseSchema } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import { TermPolicyHttpService } from '@modules/term-policy/services/term-policy.http.service';
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    EnumTermPolicyType,
    Prisma,
    TermPolicy,
} from '@generated/prisma-client';

@ApiTags('modules.public.termPolicy')
@Controller({
    version: '1',
    path: '/term-policy',
})
export class TermPolicyPublicController {
    constructor(
        private readonly termPolicyHttpService: TermPolicyHttpService
    ) {}

    @TermPolicyPublicListDoc()
    @ResponsePaging('termPolicy.list', {
        schema: TermPolicyResponseSchema,
    })
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationCursorQuery({
            availableOrderBy: TermPolicyDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryCursorParams<Prisma.TermPolicyWhereInput>,
        @PaginationQueryFilterInEnum<EnumTermPolicyType>(
            'type',
            TermPolicyDefaultType
        )
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<TermPolicy>> {
        return this.termPolicyHttpService.getListPublished(pagination, type);
    }
}
