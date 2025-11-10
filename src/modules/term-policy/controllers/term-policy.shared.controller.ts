import { ApiTags } from '@nestjs/swagger';
import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
} from '@nestjs/common';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { PaginationCursorQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { TermPolicyUserAcceptanceResponseDto } from '@modules/term-policy/dtos/response/term-policy.user-acceptance.response.dto';
import {
    TermPolicySharedAcceptDoc,
    TermPolicySharedListAcceptedDoc,
} from '@modules/term-policy/docs/term-policy.user.doc';
import { TermPolicyAcceptRequestDto } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import {
    RequestIPAddress,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
import { RequestUserAgentDto } from '@common/request/dtos/request.user-agent.dto';

@ApiTags('modules.shared.user.termPolicy')
@Controller({
    version: '1',
    path: '/user/term-policy',
})
export class TermPolicySharedController {
    constructor(private readonly termPolicyService: TermPolicyService) {}

    @TermPolicySharedListAcceptedDoc()
    @ResponsePaging('termPolicy.listAccepted')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list/accepted')
    async listAccepted(
        @PaginationCursorQuery()
        pagination: IPaginationQueryCursorParams,
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponsePagingReturn<TermPolicyUserAcceptanceResponseDto>> {
        return this.termPolicyService.getListUserAccepted(userId, pagination);
    }

    @TermPolicySharedAcceptDoc()
    @Response('termPolicy.accept')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/accept')
    async accept(
        @AuthJwtPayload('userId') userId: string,
        @Body() body: TermPolicyAcceptRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.termPolicyService.userAccept(userId, body, {
            ipAddress,
            userAgent,
        });
    }
}
