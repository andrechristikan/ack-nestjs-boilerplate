import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { ConfigService } from '@nestjs/config';
import { ENUM_TERM_POLICY_TYPE } from '@modules/term-policy/enums/term-policy.enum';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';
import { Types } from 'mongoose';

@Injectable()
export class MigrationTermPolicySeed {
    constructor(
        private readonly configService: ConfigService,
        private readonly termPolicyService: TermPolicyService
    ) {}

    @Command({
        command: 'seed:termPolicy',
        describe: 'seed terms policy',
    })
    async seeds(): Promise<void> {
        const country = this.configService.get<string>('app.country.default');

        try {
            // dummy data for term policies
            await this.termPolicyService.createMany(country, {
                [ENUM_TERM_POLICY_TYPE.TERM]: [
                    {
                        language: ENUM_MESSAGE_LANGUAGE.EN,
                        bucket: 'private-bucket',
                        completedUrl: 'https://example.com/terms-en.pdf',
                        extension: 'pdf',
                        key: 'terms-en.pdf',
                        mime: 'application/pdf',
                        size: new Types.Decimal128('123456'),
                        cdnUrl: 'https://cdn.example.com/terms-en.pdf',
                    },
                ],
                [ENUM_TERM_POLICY_TYPE.PRIVACY]: [
                    {
                        language: ENUM_MESSAGE_LANGUAGE.EN,
                        bucket: 'private-bucket',
                        completedUrl: 'https://example.com/privacy-en.pdf',
                        extension: 'pdf',
                        key: 'privacy-en.pdf',
                        mime: 'application/pdf',
                        size: new Types.Decimal128('123456'),
                        cdnUrl: 'https://cdn.example.com/privacy-en.pdf',
                    },
                ],
                [ENUM_TERM_POLICY_TYPE.COOKIES]: [
                    {
                        bucket: 'private-bucket',
                        completedUrl: 'https://example.com/cookies-en.pdf',
                        extension: 'pdf',
                        key: 'cookies-en.pdf',
                        mime: 'application/pdf',
                        size: new Types.Decimal128('123456'),
                        cdnUrl: 'https://cdn.example.com/cookies-en.pdf',
                        language: ENUM_MESSAGE_LANGUAGE.EN,
                    },
                ],
                [ENUM_TERM_POLICY_TYPE.MARKETING]: [
                    {
                        bucket: 'private-bucket',
                        completedUrl: 'https://example.com/marketing-en.pdf',
                        extension: 'pdf',
                        key: 'marketing-en.pdf',
                        mime: 'application/pdf',
                        size: new Types.Decimal128('123456'),
                        cdnUrl: 'https://cdn.example.com/marketing-en.pdf',
                        language: ENUM_MESSAGE_LANGUAGE.EN,
                    },
                ],
            });
        } catch (err: any) {
            throw new Error(err);
        }
        return;
    }

    @Command({
        command: 'remove:termPolicy',
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
