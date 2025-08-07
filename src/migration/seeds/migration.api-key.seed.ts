import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ENUM_API_KEY_TYPE } from '@modules/api-key/enums/api-key.enum';
import { ApiKeyRepository } from '@modules/api-key/repository/repositories/api-key.repository';

// TODO: TEST THIS
@Injectable()
export class MigrationApiKeySeed {
    private readonly apiKeyDefaultKey: string = 'v8VB0yY887lMpTA2VJMV';
    private readonly apiKeyDefaultSecret: string =
        'zeZbtGTugBTn3Qd5UXtSZBwt7gn3bg';
    private readonly apiKeySystemKey: string = 'OgXYkQyOtP7Zl5uCbKd8';
    private readonly apiKeySystemSecret: string =
        '3kh0hW7pIAH3wW9DwUGrP8Y5RW9Ywv';

    constructor(
        private readonly apiKeyRepository: ApiKeyRepository,
        private readonly apiKeyService: ApiKeyService
    ) {}

    @Command({
        command: 'seed:apikey',
        describe: 'seeds apikeys',
    })
    async seeds(): Promise<void> {
        const apiKeyDefaultHash = this.apiKeyService.createHashApiKey(
            this.apiKeyDefaultKey,
            this.apiKeyDefaultSecret
        );

        await this.apiKeyRepository.create({
            data: {
                description: 'Api Key Default Migration',
                type: ENUM_API_KEY_TYPE.DEFAULT,
                key: this.apiKeyDefaultKey,
                hash: apiKeyDefaultHash,
                isActive: true,
            },
        });

        const apiKeySystemHash = this.apiKeyService.createHashApiKey(
            this.apiKeySystemKey,
            this.apiKeySystemSecret
        );
        await this.apiKeyRepository.create({
            data: {
                description: 'Api Key System Migration',
                type: ENUM_API_KEY_TYPE.SYSTEM,
                key: this.apiKeySystemKey,
                hash: apiKeySystemHash,
                isActive: true,
            },
        });

        return;
    }

    @Command({
        command: 'remove:apikey',
        describe: 'remove apikeys',
    })
    async remove(): Promise<void> {
        await this.apiKeyRepository.deleteMany({
            where: {
                key: {
                    in: [this.apiKeyDefaultKey, this.apiKeySystemKey],
                },
            },
        });

        return;
    }
}
