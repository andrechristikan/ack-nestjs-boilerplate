import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';
import { ENUM_TERM_POLICY_TYPE } from '@modules/term-policy/enums/term-policy.enum';
import { HelperDateService } from '@common/helper/services/helper.date.service';

@Injectable()
export class MigrationTermPolicySeed {
    constructor(
        private readonly helperDateService: HelperDateService,
        private readonly termPolicyService: TermPolicyService
    ) {}

    @Command({
        command: 'seed:term',
        describe: 'seed terms',
    })
    async seeds(): Promise<void> {
        const now = this.helperDateService.create();
        const data: TermPolicyCreateRequestDto[] = [
            {
                title: 'Website Terms and Conditions v1',
                description:
                    'The initial version of our website terms and conditions outlining user responsibilities and acceptable use.',
                url:
                    'https://s3.amazonaws.com/website-terms-and-conditions-v1.html',
                version: 1,
                country: 'ID',
                language: ENUM_MESSAGE_LANGUAGE.EN,
                type: ENUM_TERM_POLICY_TYPE.TERM,
                publishedAt: this.helperDateService.backward(
                    now,
                    this.helperDateService.createDuration({ days: 2 })
                ),
            },
            {
                title: 'Privacy Policy',
                description:
                    'Our policy on how we collect, use, and protect your personal information.',
                url:
                    'https://s3.amazonaws.com/privacy-policy.html',
                version: 1,
                country: 'ID',
                language: ENUM_MESSAGE_LANGUAGE.EN,
                type: ENUM_TERM_POLICY_TYPE.PRIVACY,
                publishedAt: this.helperDateService.backward(
                    now,
                    this.helperDateService.createDuration({ days: 1 })
                ),
            },
            {
                title: 'Marketing Consent Policy v1',
                description:
                    'Policy regarding user consent for receiving marketing communications.',
                url:
                    'https://s3.amazonaws.com/marketing-consent-policy-v1.html',
                version: 1,
                country: 'ID',
                language: ENUM_MESSAGE_LANGUAGE.EN,
                type: ENUM_TERM_POLICY_TYPE.MARKETING,
                publishedAt: this.helperDateService.backward(
                    now,
                    this.helperDateService.createDuration({ days: 2 })
                ),
            },
            {
                title: 'Cookie Policy',
                description:
                    'Information about the cookies we use and how you can manage them.',
                url:
                    'https://s3.amazonaws.com/cookie-policy.html',
                version: 1,
                country: 'ID',
                language: ENUM_MESSAGE_LANGUAGE.EN,
                type: ENUM_TERM_POLICY_TYPE.COOKIES,
                publishedAt: this.helperDateService.backward(
                    now,
                    this.helperDateService.createDuration({ days: 1 })
                ),
            },
        ];

        try {
            await this.termPolicyService.createMany(data);
        } catch (err: any) {
            throw new Error(err);
        }

        return;
    }

    @Command({
        command: 'remove:term',
        describe: 'remove terms',
    })
    async remove(): Promise<void> {
        try {
            await this.termPolicyService.deleteMany();
        } catch (err: any) {
            throw new Error(err);
        }

        return;
    }
}
