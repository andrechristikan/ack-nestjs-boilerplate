import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
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
        // TODO: NEXT: MIGRATE IT TO THE AWS S3 BUCKET
        // const now = this.helperDateService.create();
        // const data: TermPolicyCreateRequestDto[] = [
        //     {
        //         title: 'Website Terms and Conditions v1',
        //         description:
        //             'The initial version of our website terms and conditions outlining user responsibilities and acceptable use.',
        //         documentUrl:
        //             'By accessing or using our website, you agree to comply with these terms and conditions. Please read them carefully before using our services.',
        //         version: 1,
        //         country: 'UK',
        //         language: ENUM_MESSAGE_LANGUAGE.EN,
        //         type: ENUM_TERM_POLICY_TYPE.TERM,
        //         publishedAt: this.helperDateService.backward(
        //             now,
        //             this.helperDateService.createDuration({ days: 2 })
        //         ),
        //     },
        //     {
        //         title: 'Website Terms and Conditions v2',
        //         description:
        //             'Updated terms and conditions reflecting recent changes in our service offerings and user obligations.',
        //         documentUrl:
        //             'This updated version includes new clauses regarding user data protection and service limitations. Continued use of our website constitutes acceptance of these changes.',
        //         version: 2,
        //         country: 'UK',
        //         language: ENUM_MESSAGE_LANGUAGE.EN,
        //         type: ENUM_TERM_POLICY_TYPE.TERM,
        //         publishedAt: this.helperDateService.backward(
        //             now,
        //             this.helperDateService.createDuration({ days: 1 })
        //         ),
        //     },
        //     {
        //         title: 'Privacy Policy',
        //         description:
        //             'Our policy on how we collect, use, and protect your personal information.',
        //         documentUrl:
        //             'We value your privacy. This policy explains what information we collect, how we use it, and your rights regarding your data.',
        //         version: 1,
        //         country: 'UK',
        //         language: ENUM_MESSAGE_LANGUAGE.EN,
        //         type: ENUM_TERM_POLICY_TYPE.PRIVACY,
        //         publishedAt: this.helperDateService.backward(
        //             now,
        //             this.helperDateService.createDuration({ days: 1 })
        //         ),
        //     },
        //     {
        //         title: 'Marketing Consent Policy v1',
        //         description:
        //             'Policy regarding user consent for receiving marketing communications.',
        //         documentUrl:
        //             'By agreeing to this policy, you consent to receive marketing emails and updates from us. You can opt out at any time.',
        //         version: 1,
        //         country: 'UK',
        //         language: ENUM_MESSAGE_LANGUAGE.EN,
        //         type: ENUM_TERM_POLICY_TYPE.MARKETING,
        //         publishedAt: this.helperDateService.backward(
        //             now,
        //             this.helperDateService.createDuration({ days: 2 })
        //         ),
        //     },
        //     {
        //         title: 'Marketing Consent Policy v2',
        //         description:
        //             'Revised marketing policy with additional information on communication preferences.',
        //         documentUrl:
        //             'This version provides more options for managing your marketing preferences and details how we use your contact information.',
        //         version: 2,
        //         country: 'UK',
        //         language: ENUM_MESSAGE_LANGUAGE.EN,
        //         type: ENUM_TERM_POLICY_TYPE.MARKETING,
        //         publishedAt: this.helperDateService.backward(
        //             now,
        //             this.helperDateService.createDuration({ days: 1 })
        //         ),
        //     },
        //     {
        //         title: 'Cookie Policy',
        //         description:
        //             'Information about the cookies we use and how you can manage them.',
        //         documentUrl:
        //             'Our website uses cookies to enhance your browsing experience. This policy explains what cookies are, which ones we use, and how you can control them.',
        //         version: 1,
        //         country: 'UK',
        //         language: ENUM_MESSAGE_LANGUAGE.EN,
        //         type: ENUM_TERM_POLICY_TYPE.COOKIES,
        //         publishedAt: this.helperDateService.backward(
        //             now,
        //             this.helperDateService.createDuration({ days: 1 })
        //         ),
        //     },
        // ];
        // try {
        //     await this.termPolicyService.createMany(data);
        // } catch (err: any) {
        //     throw new Error(err);
        // }
        // return;
    }

    @Command({
        command: 'remove:term',
        describe: 'remove terms',
    })
    async remove(): Promise<void> {
        // try {
        //     await this.termPolicyService.deleteMany();
        // } catch (err: any) {
        //     throw new Error(err);
        // }

        return;
    }
}
