import { ApiTags } from '@nestjs/swagger';
import {
    BadRequestException,
    Body,
    Controller,
    Get,
    InternalServerErrorException,
    NotFoundException,
    Post,
} from '@nestjs/common';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { IResponsePaging } from '@common/response/interfaces/response.interface';
import { TermPolicyAcceptRequestDto } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import { ENUM_TERM_POLICY_STATUS_CODE_ERROR } from '@modules/term-policy/enums/term-policy.status-code.enum';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { RequestCountry } from '@common/request/decorators/request.decorator';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { PaginationQuery } from '@common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from '@common/pagination/dtos/pagination.list.dto';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { PolicyRoleProtected } from '@modules/policy/decorators/policy.decorator';
import { ENUM_POLICY_ROLE_TYPE } from '@modules/policy/enums/policy.enum';
import { TermPolicyAcceptanceResponseDto } from '@modules/term-policy/dtos/response/term-policy-acceptance.response.dto';
import {
    TermPolicyUserAcceptDoc,
    TermPolicyUserAcceptedDoc,
} from '@modules/term-policy/docs/term-policy.user.doc';
import { UserService } from '@modules/user/services/user.service';
import { TERM_POLICY_ACCEPTANCE_DEFAULT_AVAILABLE_ORDER_BY } from '@modules/term-policy/constants/term-policy.list.constant';
import { DatabaseService } from '@common/database/services/database.service';
import { ENUM_APP_STATUS_CODE_ERROR } from '@app/enums/app.status-code.enum';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';

@ApiTags('modules.user.term-policy')
@Controller({
    version: '1',
    path: '/term-policy',
})
export class TermPolicyUserController {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly userService: UserService,
        private readonly termPolicyService: TermPolicyService,
        private readonly termPolicyAcceptanceService: TermPolicyAcceptanceService,
        private readonly paginationService: PaginationService
    ) {}

    @TermPolicyUserAcceptedDoc()
    @ResponsePaging('termPolicy.accepted')
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.USER)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list/accepted')
    async accepted(
        @AuthJwtPayload('user') user: string,
        @PaginationQuery({
            availableOrderBy: TERM_POLICY_ACCEPTANCE_DEFAULT_AVAILABLE_ORDER_BY,
        })
        { _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging<TermPolicyAcceptanceResponseDto>> {
        const [termPolicies, total] = await Promise.all([
            this.termPolicyAcceptanceService.findAllByUser(user, {
                paging: {
                    limit: _limit,
                    offset: _offset,
                },
                order: _order,
            }),
            this.termPolicyAcceptanceService.getTotalUser(user),
        ]);

        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        const mapped = this.termPolicyAcceptanceService.mapList(termPolicies);

        return {
            _pagination: { total, totalPage },
            data: mapped,
        };
    }

    @TermPolicyUserAcceptDoc()
    @Response('termPolicy.accept')
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.USER)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/accept')
    async accept(
        @AuthJwtPayload('user') userId: string,
        @RequestCountry() country: string,
        @Body() { type }: TermPolicyAcceptRequestDto
    ): Promise<void> {
        const user = await this.userService.findOneById(userId);
        if (user.termPolicy[type.toLowerCase()]) {
            throw new BadRequestException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.ALREADY_ACCEPTED,
                message: 'termPolicy.error.alreadyAccepted',
            });
        }

        const policy = await this.termPolicyService.findOnePublished(
            type,
            country
        );
        if (!policy) {
            throw new NotFoundException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'termPolicy.error.notFound',
            });
        }

        const session = await this.databaseService.createTransaction();

        try {
            await this.termPolicyAcceptanceService.create(userId, policy._id, {
                session,
            });
            await this.userService.acceptTermPolicy(user, type, { session });

            await this.databaseService.commitTransaction(session);
        } catch (err: unknown) {
            await this.databaseService.abortTransaction(session);

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }

        return;
    }
}
