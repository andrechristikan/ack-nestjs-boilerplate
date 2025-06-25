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
import { TermsPolicyAcceptanceService } from '@modules/terms-policy/services/terms-policy-acceptance.service';
import { IResponse } from '@common/response/interfaces/response.interface';
import { TermsPolicyAcceptRequestDto } from '@modules/terms-policy/dtos/request/terms-policy.accept.request.dto';
import { ENUM_TERMS_POLICY_STATUS_CODE_ERROR } from '@modules/terms-policy/enums/terms-policy.status-code.enum';
import { TermsPolicyAcceptanceGetResponseDto } from '@modules/terms-policy/dtos/response/terms-policy-acceptance.get.response.dto';
import { TermsPolicyAcceptanceListResponseDto } from '@modules/terms-policy/dtos/response/terms-policy-acceptance.list.response.dto';
import { Response } from '@common/response/decorators/response.decorator';
import { TermsPolicyService } from '@modules/terms-policy/services/terms-policy.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    TermsPolicyAuthAcceptDoc,
    TermsPolicyAuthAcceptedDoc,
} from '@modules/terms-policy/docs/terms-policy.auth.doc';
import { TermsPolicyListResponseDto } from '@modules/terms-policy/dtos/response/terms-policy.list.response.dto';
import { RequestLanguage } from '@common/request/decorators/request.decorator';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';

@ApiTags('modules.user.terms-policy')
@Controller({
    version: '1',
    path: '/terms-policy',
})
export class TermsPolicyUserController {
    constructor(
        private readonly termsPolicyService: TermsPolicyService,
        private readonly termsPolicyAcceptanceService: TermsPolicyAcceptanceService,
        private readonly helperDateService: HelperDateService
    ) {}

    @TermsPolicyAuthAcceptDoc()
    @Post('/accept')
    @Response('terms-policy.accept')
    @UserProtected()
    @AuthJwtAccessProtected()
    async accept(
        @AuthJwtPayload('user') user: string,
        @Body() request: TermsPolicyAcceptRequestDto
    ): Promise<IResponse<TermsPolicyAcceptanceGetResponseDto>> {
        const policy = await this.termsPolicyService.findOneById(
            request.policy
        );
        if (!policy) {
            throw new NotFoundException({
                statusCode: ENUM_TERMS_POLICY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'terms-policy.error.notFound',
            });
        }

        const isPublished =
            !!policy.publishedAt &&
            policy.publishedAt < this.helperDateService.create();
        if (!isPublished) {
            throw new BadRequestException({
                statusCode: ENUM_TERMS_POLICY_STATUS_CODE_ERROR.NOT_ACTIVE,
                message: 'terms-policy.error.inactive',
            });
        }

        const isAccepted = await this.termsPolicyAcceptanceService.findOneAcceptedByUser(
            user,
            policy.type,
            policy.country
        );

        if (isAccepted) {
            throw new BadRequestException({
                statusCode:
                    ENUM_TERMS_POLICY_STATUS_CODE_ERROR.ALREADY_ACCEPTED,
                message: 'terms-policy.error.alreadyAccepted',
            });
        }

        const latestVersion = await this.termsPolicyService.findOne({
            type: policy.type,
            language: policy.language,
            country: policy.country,
            latest: true,
            published: true,
        });

        if (policy.id != latestVersion.id) {
            throw new BadRequestException({
                statusCode:
                ENUM_TERMS_POLICY_STATUS_CODE_ERROR.NOT_LATEST_VERSION,
                message: 'terms-policy.error.newerVersionExist',
            });
        }

        const accept = await this.termsPolicyAcceptanceService.create(
            user,
            policy.type,
            policy.country,
            policy.language,
            policy.version,
            this.helperDateService.create()
        );

        return {
            data: this.termsPolicyAcceptanceService.mapGet(accept),
        };
    }

    @TermsPolicyAuthAcceptedDoc()
    @Get('/accepted')
    @Response('terms-policy.accepted')
    @UserProtected()
    @AuthJwtAccessProtected()
    async accepted(
        @AuthJwtPayload('user') user: string
    ): Promise<IResponse<TermsPolicyAcceptanceListResponseDto[]>> {
        const acceptedPolicies =
            await this.termsPolicyAcceptanceService.findAllAcceptedPoliciesByUser(user);

        return {
            data: this.termsPolicyAcceptanceService.mapList(acceptedPolicies),
        };
    }

    @Get('/pending')
    @Response('terms-policy.pending')
    @UserProtected()
    @AuthJwtAccessProtected()
    async pending(
        @AuthJwtPayload('user') user: string,
        @RequestLanguage() language: ENUM_MESSAGE_LANGUAGE
    ): Promise<IResponse<TermsPolicyListResponseDto[]>> {
        const latestPolicies =
            await this.termsPolicyService.findAllByFilters({latest: true, language: language});

        const acceptedPolicies =
            await this.termsPolicyAcceptanceService.findAllAcceptedPoliciesByUser(
                user
            );

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
            data: this.termsPolicyService.mapList(pendingPolicies),
        };
    }
}
