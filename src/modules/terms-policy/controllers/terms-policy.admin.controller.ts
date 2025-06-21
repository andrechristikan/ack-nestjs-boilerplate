import { ApiTags } from '@nestjs/swagger';
import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    NotFoundException,
    Param,
    Post,
    Put,
} from '@nestjs/common';
import { TermsPolicyService } from '@modules/terms-policy/services/terms-policy.service';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from '@common/response/interfaces/response.interface';
import { TermsPolicyCreateRequestDto } from '@modules/terms-policy/dtos/request/terms-policy.create.request.dto';
import { PaginationQuery } from '@common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from '@common/pagination/dtos/pagination.list.dto';
import { TermsPolicyGetResponseDto } from '@modules/terms-policy/dtos/response/terms-policy.get.response.dto';
import { ENUM_TERMS_POLICY_STATUS_CODE_ERROR } from '@modules/terms-policy/enums/terms-policy.status-code.enum';
import { TermsPolicyListResponseDto } from '@modules/terms-policy/dtos/response/terms-policy.list.response.dto';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from '@modules/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '@modules/policy/enums/policy.enum';
import {
    TermsPolicyAuthGetDoc,
    TermsPolicyAuthListDoc,
    TermsPolicyAuthUpdateDoc,
} from '@modules/terms-policy/docs/terms-policy.auth.doc';
import {
    TermsPolicyAdminCreateDoc,
    TermsPolicyAdminDeleteDoc,
} from '@modules/terms-policy/docs/terms-policy.admin.doc';
import { UserParsePipe } from '@modules/user/pipes/user.parse.pipe';
import { UserDoc } from '@modules/user/repository/entities/user.entity';
import { TermsPolicyUpdateRequestDto } from '@modules/terms-policy/dtos/request/terms-policy.update.request.dto';

@ApiTags('modules.admin.terms-policy')
@Controller({
    version: '1',
    path: '/terms-policy',
})
export class TermsPolicyAdminController {
    constructor(
        private readonly termsPolicyService: TermsPolicyService,
        private readonly helperDateService: HelperDateService,
        private readonly paginationService: PaginationService
    ) {}

    @TermsPolicyAuthListDoc()
    @ResponsePaging('terms-policy.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TERM,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @Get('/')
    async list(
        @PaginationQuery()
        { _search, _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging<TermsPolicyListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
        };

        const [terms, total] = await Promise.all([
            this.termsPolicyService.findAll(find, {
                paging: {
                    limit: _limit,
                    offset: _offset,
                },
                order: _order,
            }),
            this.termsPolicyService.getTotal(find),
        ]);

        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        const mapped = this.termsPolicyService.mapList(terms);

        return {
            _pagination: { total, totalPage },
            data: mapped,
        };
    }

    @TermsPolicyAuthGetDoc()
    @UserProtected()
    @AuthJwtAccessProtected()
    @Response('terms-policy.get')
    @Get('/:id')
    async get(
        @Param('id') id: string
    ): Promise<IResponse<TermsPolicyGetResponseDto>> {
        const termsPolicy = await this.termsPolicyService.findOneById(id);

        if (!termsPolicy) {
            throw new NotFoundException({
                statusCode: ENUM_TERMS_POLICY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'terms-policy.error.notFound',
            });
        }

        const mapped = this.termsPolicyService.mapGet(termsPolicy);
        return {
            data: mapped,
        };
    }

    @TermsPolicyAdminCreateDoc()
    @Response('terms-policy.create')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TERM,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @Post('/')
    async create(
        @Body() dto: TermsPolicyCreateRequestDto
    ): Promise<IResponse<TermsPolicyGetResponseDto>> {
        const termsPolicy = await this.termsPolicyService.create(dto);
        const mapped = this.termsPolicyService.mapGet(termsPolicy);
        return {
            data: mapped,
        };
    }

    @TermsPolicyAuthUpdateDoc()
    @Response('terms-policy.update')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TERM,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @Put('/:id')
    async update(
        @Param('id') id: string,
        @Body() dto: TermsPolicyUpdateRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserDoc
    ): Promise<IResponse<TermsPolicyGetResponseDto>> {
        const termsPolicy = await this.termsPolicyService.findOneById(id);

        if (!termsPolicy) {
            throw new NotFoundException({
                statusCode: ENUM_TERMS_POLICY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'terms-policy.error.notFound',
            });
        }

        const isPublished =
            !!termsPolicy.publishedAt &&
            termsPolicy.publishedAt < this.helperDateService.create();
        if (isPublished) {
            throw new BadRequestException({
                statusCode:
                    ENUM_TERMS_POLICY_STATUS_CODE_ERROR.UPDATE_FORBIDDEN_STATUS_PUBLISHED,
                message: 'terms-policy.error.updateForbiddenStatusPublished',
            });
        }

        Object.assign(termsPolicy, dto);

        const updatedTermsPolicy = await this.termsPolicyService.update(
            termsPolicy,
            { actionBy: user.id }
        );
        const mapped = this.termsPolicyService.mapGet(updatedTermsPolicy);

        return {
            data: mapped,
        };
    }

    @TermsPolicyAdminDeleteDoc()
    @Response('terms-policy.delete')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TERM,
        action: [ENUM_POLICY_ACTION.DELETE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @Delete('/:id')
    async delete(@Param('id') id: string): Promise<IResponse> {
        // Check if the entity exists before deleting
        const termsPolicy = await this.termsPolicyService.findOneById(id);

        if (!termsPolicy) {
            throw new NotFoundException({
                statusCode: ENUM_TERMS_POLICY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'terms-policy.error.notFound',
            });
        }

        await this.termsPolicyService.delete(id);
        return;
    }
}
