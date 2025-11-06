import { Command } from 'nestjs-command';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@common/database/services/database.service';
import { ENUM_TERM_POLICY_STATUS, ENUM_TERM_POLICY_TYPE } from '@prisma/client';
import { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import { faker } from '@faker-js/faker';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';

@Injectable()
export class MigrationTermPolicySeed {
    private readonly logger = new Logger(MigrationTermPolicySeed.name);

    private readonly termPolicies: TermPolicyCreateRequestDto[] = [
        {
            type: ENUM_TERM_POLICY_TYPE.COOKIE,
            version: 1,
            contents: [
                {
                    key: faker.system.filePath(),
                    language: ENUM_MESSAGE_LANGUAGE.EN,
                    size: faker.number.int({ min: 1000, max: 5000 }),
                },
            ],
        },
        {
            type: ENUM_TERM_POLICY_TYPE.MARKETING,
            version: 1,
            contents: [
                {
                    key: faker.system.filePath(),
                    language: ENUM_MESSAGE_LANGUAGE.EN,
                    size: faker.number.int({ min: 1000, max: 5000 }),
                },
            ],
        },
        {
            type: ENUM_TERM_POLICY_TYPE.PRIVACY,
            version: 1,
            contents: [
                {
                    key: faker.system.filePath(),
                    language: ENUM_MESSAGE_LANGUAGE.EN,
                    size: faker.number.int({ min: 1000, max: 5000 }),
                },
            ],
        },
        {
            type: ENUM_TERM_POLICY_TYPE.TERMS_OF_SERVICE,
            version: 1,
            contents: [
                {
                    key: faker.system.filePath(),
                    language: ENUM_MESSAGE_LANGUAGE.EN,
                    size: faker.number.int({ min: 1000, max: 5000 }),
                },
            ],
        },
    ];

    constructor(private readonly databaseService: DatabaseService) {}

    @Command({
        command: 'seed:termPolicy',
        describe: 'seeds termPolicies',
    })
    async seeds(): Promise<void> {
        this.logger.log('Seeding TermPolicies...');

        const existingTermPolicies =
            await this.databaseService.termPolicy.findMany({
                where: {
                    type: {
                        in: this.termPolicies.map(
                            termPolicy => termPolicy.type
                        ),
                    },
                },
                select: {
                    id: true,
                },
            });
        if (existingTermPolicies.length > 0) {
            this.logger.log('TermPolicies already exist, skipping seed.');
            return;
        }

        await this.databaseService.termPolicy.createMany({
            data: this.termPolicies.map(termPolicy => ({
                ...termPolicy,
                contents: termPolicy.contents.map(content => ({
                    ...content,
                })),
                status: ENUM_TERM_POLICY_STATUS.PUBLISHED,
            })),
        });

        this.logger.log('TermPolicies seeded successfully.');

        return;
    }

    @Command({
        command: 'remove:termPolicy',
        describe: 'remove termPolicies',
    })
    async remove(): Promise<void> {
        this.logger.log('Removing TermPolicies...');

        await this.databaseService.termPolicy.deleteMany({});

        this.logger.log('TermPolicies removed successfully.');

        return;
    }
}
