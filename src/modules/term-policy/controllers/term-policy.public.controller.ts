import { ApiTags } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { IResponsePaging } from '@common/response/interfaces/response.interface';
import { ResponsePaging } from '@common/response/decorators/response.decorator';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    PaginationQuery,
    PaginationQueryFilterEqual,
    PaginationQueryFilterInEnum,
} from '@common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from '@common/pagination/dtos/pagination.list.dto';
import { TermPolicyResponseDto } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import {
    ENUM_TERM_POLICY_STATUS,
    ENUM_TERM_POLICY_TYPE,
} from '@modules/term-policy/enums/term-policy.enum';
import {
    TERM_POLICY_DEFAULT_AVAILABLE_ORDER_BY,
    TERM_POLICY_DEFAULT_TYPE,
} from '@modules/term-policy/constants/term-policy.list.constant';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { TermPolicyPublicListDoc } from '@modules/term-policy/docs/term-policy.public.doc';

@ApiTags('modules.public.term-policy')
@Controller({
    version: '1',
    path: '/term-policy',
})
export class TermPolicyPublicController {
    constructor(
        private readonly termPolicyService: TermPolicyService,
        private readonly paginationService: PaginationService
    ) {}

    @ResponsePaging('termPolicy.accepted')
    @TermPolicyPublicListDoc()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationQuery({
            availableOrderBy: TERM_POLICY_DEFAULT_AVAILABLE_ORDER_BY,
        })
        { _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterEqual('country')
        country: Record<string, any>,
        @PaginationQueryFilterInEnum(
            'type',
            TERM_POLICY_DEFAULT_TYPE,
            ENUM_TERM_POLICY_TYPE
        )
        type: Record<string, any>
    ): Promise<IResponsePaging<TermPolicyResponseDto>> {
        const find: Record<string, any> = {
            ...country,
            ...type,
            status: ENUM_TERM_POLICY_STATUS.PUBLISHED,
        };

        const [termPolicies, total] = await Promise.all([
            this.termPolicyService.findAll(find, {
                paging: {
                    limit: _limit,
                    offset: _offset,
                },
                order: _order,
            }),
            this.termPolicyService.getTotal(find),
        ]);

        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        const mapped = this.termPolicyService.mapList(termPolicies);

        return {
            _pagination: { total, totalPage },
            data: mapped,
        };
    }
}
