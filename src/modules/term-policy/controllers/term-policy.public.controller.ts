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
import { TermPolicyResponseDto } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EnumTermPolicyType } from '@prisma/client';

@ApiTags('modules.public.termPolicy')
@Controller({
    version: '1',
    path: '/term-policy',
})
export class TermPolicyPublicController {
    constructor(private readonly termPolicyService: TermPolicyService) {}

    @TermPolicyPublicListDoc()
    @ResponsePaging('termPolicy.list')
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationCursorQuery({
            availableSearch: TermPolicyDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryCursorParams,
        @PaginationQueryFilterInEnum<EnumTermPolicyType>(
            'type',
            TermPolicyDefaultType
        )
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<TermPolicyResponseDto>> {
        return this.termPolicyService.getListPublished(pagination, type);
    }
}
