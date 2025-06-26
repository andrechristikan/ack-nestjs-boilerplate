import { ApiTags } from '@nestjs/swagger';
import {
    BadRequestException,
    Body,
    Controller,
    Get,
    NotFoundException,
    Post,
} from '@nestjs/common';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy-acceptance.service';
import { IResponse } from '@common/response/interfaces/response.interface';
import { TermPolicyAcceptRequestDto } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import { ENUM_TERM_POLICY_STATUS_CODE_ERROR } from '@modules/term-policy/enums/term-policy.status-code.enum';
import { TermPolicyAcceptanceGetResponseDto } from '@modules/term-policy/dtos/response/term-policy-acceptance.get.response.dto';
import { TermPolicyAcceptanceListResponseDto } from '@modules/term-policy/dtos/response/term-policy-acceptance.list.response.dto';
import { Response } from '@common/response/decorators/response.decorator';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    TermPolicyAuthAcceptDoc,
    TermPolicyAuthAcceptedDoc,
} from '@modules/term-policy/docs/term-policy.auth.doc';
import { TermPolicyListResponseDto } from '@modules/term-policy/dtos/response/term-policy.list.response.dto';
import { RequestCountry, RequestLanguage } from '@common/request/decorators/request.decorator';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';

@ApiTags('modules.user.term-policy')
@Controller({
    version: '1',
    path: '/term-policy',
})
export class TermPolicyUserController {
    constructor(
        private readonly termPolicyService: TermPolicyService,
        private readonly termPolicyAcceptanceService: TermPolicyAcceptanceService,
        private readonly helperDateService: HelperDateService
    ) {}

    @TermPolicyAuthAcceptDoc()
    @Post('/accept')
    @Response('term-policy.accept')
    @UserProtected()
    @AuthJwtAccessProtected()
    async accept(
        @AuthJwtPayload('user') user: string,
        @Body() request: TermPolicyAcceptRequestDto,
        @RequestCountry() country: string,
    ): Promise<IResponse<TermPolicyAcceptanceGetResponseDto>> {
        const policy = await this.termPolicyService.findOne(
            {
                _id: request.policy,
                country: country
            }
        );
        if (!policy) {
            throw new NotFoundException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'term-policy.error.notFound',
            });
        }

        const isPublished =
            !!policy.publishedAt &&
            policy.publishedAt < this.helperDateService.create();
        if (!isPublished) {
            throw new BadRequestException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.NOT_PUBLISHED,
                message: 'term-policy.error.inactive',
            });
        }

        const isAccepted = await this.termPolicyAcceptanceService.findOneByUser(
            user,
            policy.type,
            policy.country,
            policy.language
        );

        if (isAccepted) {
            throw new BadRequestException({
                statusCode:
                    ENUM_TERM_POLICY_STATUS_CODE_ERROR.ALREADY_ACCEPTED,
                message: 'term-policy.error.alreadyAccepted',
            });
        }

        const latestVersion = await this.termPolicyService.findOne({
            type: policy.type,
            language: policy.language,
            country: policy.country,
            latest: true,
            published: true,
        });

        if (policy.id != latestVersion.id) {
            throw new BadRequestException({
                statusCode:
                ENUM_TERM_POLICY_STATUS_CODE_ERROR.NOT_LATEST_VERSION,
                message: 'term-policy.error.newerVersionExist',
            });
        }

        const accept = await this.termPolicyAcceptanceService.create(
            user,
            policy.type,
            policy.country,
            policy.language,
            policy.version,
            this.helperDateService.create()
        );

        return {
            data: this.termPolicyAcceptanceService.mapGet(accept),
        };
    }

    @TermPolicyAuthAcceptedDoc()
    @Get('/accepted')
    @Response('term-policy.accepted')
    @UserProtected()
    @AuthJwtAccessProtected()
    async accepted(
        @AuthJwtPayload('user') user: string
    ): Promise<IResponse<TermPolicyAcceptanceListResponseDto[]>> {
        const acceptedPolicies =
            await this.termPolicyAcceptanceService.findAllByUser(user);

        return {
            data: this.termPolicyAcceptanceService.mapList(acceptedPolicies),
        };
    }

    @Get('/pending')
    @Response('term-policy.pending')
    @UserProtected()
    @AuthJwtAccessProtected()
    async pending(
        @AuthJwtPayload('user') user: string,
        @RequestLanguage() language: ENUM_MESSAGE_LANGUAGE
    ): Promise<IResponse<TermPolicyListResponseDto[]>> {
        const latestPolicies =
            await this.termPolicyService.findAllByFilters({latest: true, language: language});

        const acceptedPolicies =
            await this.termPolicyAcceptanceService.findAllByUser(user);

        // Filter out policies that the user has already accepted
        const pendingPolicies = latestPolicies.filter(policy => {
            const acceptedPolicy = acceptedPolicies.find(
                accepted =>
                    accepted.type === policy.type &&
                    accepted.country === policy.country
            );

            return !acceptedPolicy;
        });

        return {
            data: this.termPolicyService.mapList(pendingPolicies),
        };
    }
}
