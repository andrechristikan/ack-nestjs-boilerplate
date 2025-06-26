import { ApiTags } from '@nestjs/swagger';
import {
    BadRequestException,
    Body,
    ConflictException,
    Controller,
    Delete,
    Get,
    NotFoundException,
    Param,
    Post,
    Put,
} from '@nestjs/common';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
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
import { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import { PaginationQuery } from '@common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from '@common/pagination/dtos/pagination.list.dto';
import { TermPolicyGetResponseDto } from '@modules/term-policy/dtos/response/term-policy.get.response.dto';
import { ENUM_TERM_POLICY_STATUS_CODE_ERROR } from '@modules/term-policy/enums/term-policy.status-code.enum';
import { TermPolicyListResponseDto } from '@modules/term-policy/dtos/response/term-policy.list.response.dto';
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
    TermPolicyAuthGetDoc,
    TermPolicyAuthListDoc,
    TermPolicyAuthUpdateDoc,
} from '@modules/term-policy/docs/term-policy.auth.doc';
import {
    TermPolicyAdminCreateDoc,
    TermPolicyAdminDeleteDoc,
} from '@modules/term-policy/docs/term-policy.admin.doc';
import { UserParsePipe } from '@modules/user/pipes/user.parse.pipe';
import { UserDoc } from '@modules/user/repository/entities/user.entity';
import { TermPolicyUpdateRequestDto } from '@modules/term-policy/dtos/request/term-policy.update.request.dto';

@ApiTags('modules.admin.term-policy')
@Controller({
    version: '1',
    path: '/term-policy',
})
export class TermPolicyAdminController {
    constructor(
        private readonly termPolicyService: TermPolicyService,
        private readonly helperDateService: HelperDateService,
        private readonly paginationService: PaginationService
    ) {}

    @TermPolicyAuthListDoc()
    @ResponsePaging('term-policy.list')
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
    ): Promise<IResponsePaging<TermPolicyListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
        };

        const [terms, total] = await Promise.all([
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

        const mapped = this.termPolicyService.mapList(terms);

        return {
            _pagination: { total, totalPage },
            data: mapped,
        };
    }

    @TermPolicyAuthGetDoc()
    @UserProtected()
    @AuthJwtAccessProtected()
    @Response('term-policy.get')
    @Get('/:id')
    async get(
        @Param('id') id: string
    ): Promise<IResponse<TermPolicyGetResponseDto>> {
        const termPolicy = await this.termPolicyService.findOneById(id);

        if (!termPolicy) {
            throw new NotFoundException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'term-policy.error.notFound',
            });
        }

        const mapped = this.termPolicyService.mapGet(termPolicy);
        return {
            data: mapped,
        };
    }

    @TermPolicyAdminCreateDoc()
    @Response('term-policy.create')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TERM,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @Post('/')
    async create(
        @Body() dto: TermPolicyCreateRequestDto
    ): Promise<IResponse<TermPolicyGetResponseDto>> {
        const exist = await this.termPolicyService.findOne({
            language: dto.language,
            country: dto.country,
            version: dto.version,
            type: dto.type,
        });
        if (exist) {
            throw new ConflictException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.EXIST,
                message: 'term-policy.error.exist',
            });
        }
        const termPolicy = await this.termPolicyService.create(dto);
        const mapped = this.termPolicyService.mapGet(termPolicy);
        return {
            data: mapped,
        };
    }

    @TermPolicyAuthUpdateDoc()
    @Response('term-policy.update')
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
        @Body() dto: TermPolicyUpdateRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserDoc
    ): Promise<IResponse<TermPolicyGetResponseDto>> {
        const termPolicy = await this.termPolicyService.findOneById(id);

        if (!termPolicy) {
            throw new NotFoundException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'term-policy.error.notFound',
            });
        }

        const isPublished =
            !!termPolicy.publishedAt &&
            termPolicy.publishedAt < this.helperDateService.create();
        if (isPublished) {
            throw new BadRequestException({
                statusCode:
                    ENUM_TERM_POLICY_STATUS_CODE_ERROR.UPDATE_FORBIDDEN_STATUS_PUBLISHED,
                message: 'term-policy.error.updateForbiddenStatusPublished',
            });
        }

        Object.assign(termPolicy, dto);

        const updatedTermPolicy = await this.termPolicyService.update(
            termPolicy,
            { actionBy: user.id }
        );
        const mapped = this.termPolicyService.mapGet(updatedTermPolicy);

        return {
            data: mapped,
        };
    }

    @TermPolicyAdminDeleteDoc()
    @Response('term-policy.delete')
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
        const termPolicy = await this.termPolicyService.findOneById(id);

        if (!termPolicy) {
            throw new NotFoundException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'term-policy.error.notFound',
            });
        }

        await this.termPolicyService.delete(id);
        return;
    }
}
