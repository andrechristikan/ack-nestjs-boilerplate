import type { TermPolicyAcceptedListRequestDto } from '@modules/term-policy/dtos/request/term-policy.accepted-list.request.dto';
import { TermPolicyAcceptedListRequestSchema } from '@modules/term-policy/dtos/request/term-policy.accepted-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import { ApiTags } from '@nestjs/swagger';
import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Query,
} from '@nestjs/common';

import {
    UserCurrent,
    UserProtected,
} from '@modules/user/decorators/user.decorator';

import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';

import {
    Response,
    ResponsePagination,
} from '@common/response/decorators/response.decorator';

import { TermPolicyAcceptanceHttpService } from '@modules/term-policy/services/term-policy.acceptance.http.service';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';

import { TermPolicyUserAcceptanceResponseSchema } from '@modules/term-policy/dtos/response/term-policy.user-acceptance.response.dto';
import { TermPolicyAcceptRequestSchema } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import type { TermPolicyAcceptRequestDto } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import type { ITermPolicyUserAcceptance } from '@modules/term-policy/interfaces/term-policy.interface';
import type { IUser } from '@modules/user/interfaces/user.interface';

@ApiTags('modules.shared.user.termPolicy')
@Controller({
    version: '1',
    path: '/user/term-policy',
})
export class TermPolicySharedController {
    constructor(
        private readonly termPolicyAcceptanceHttpService: TermPolicyAcceptanceHttpService
    ) {}

    @Doc({ summary: 'List of terms or policies accepted by the user' })
    @ResponsePagination('termPolicy.listAccepted', {
        schema: TermPolicyUserAcceptanceResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/acceptance/list')
    async listAccepted(
        @Query({ schema: TermPolicyAcceptedListRequestSchema })
        query: TermPolicyAcceptedListRequestDto,
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponsePaginationReturn<ITermPolicyUserAcceptance>> {
        return this.termPolicyAcceptanceHttpService.getListUserAccepted(
            userId,
            query
        );
    }

    @Doc({ summary: 'User accepts term or policy' })
    @Response('termPolicy.accept')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @HttpCode(HttpStatus.OK)
    @Post('/accept')
    async accept(
        @UserCurrent() user: IUser,
        @Body({ schema: TermPolicyAcceptRequestSchema })
        body: TermPolicyAcceptRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.termPolicyAcceptanceHttpService.userAccept(user, body);
    }
}
