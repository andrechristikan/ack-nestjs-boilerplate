import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { ApiKeyService } from 'src/modules/api-key/services/api-key.service';
import { ENUM_API_KEY_TYPE } from 'src/modules/api-key/enums/api-key.enum';

@Injectable()
export class MigrationApiKeySeed {
    constructor(private readonly apiKeyService: ApiKeyService) {}

    @Command({
        command: 'seed:apikey',
        describe: 'seeds apikeys',
    })
    async seeds(): Promise<void> {
        try {
            const apiKeyDefaultKey = 'v8VB0yY887lMpTA2VJMV';
            const apiKeyDefaultSecret = 'zeZbtGTugBTn3Qd5UXtSZBwt7gn3bg';
            await this.apiKeyService.createRaw({
                name: 'Api Key Default Migration',
                type: ENUM_API_KEY_TYPE.DEFAULT,
                key: apiKeyDefaultKey,
                secret: apiKeyDefaultSecret,
            });

            const apiKeyPrivateKey = 'OgXYkQyOtP7Zl5uCbKd8';
            const apiKeyPrivateSecret = '3kh0hW7pIAH3wW9DwUGrP8Y5RW9Ywv';
            await this.apiKeyService.createRaw({
                name: 'Api Key System Migration',
                type: ENUM_API_KEY_TYPE.SYSTEM,
                key: apiKeyPrivateKey,
                secret: apiKeyPrivateSecret,
            });
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }

    @Command({
        command: 'remove:apikey',
        describe: 'remove apikeys',
    })
    async remove(): Promise<void> {
        try {
            await this.apiKeyService.deleteMany({});
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }
}
