import { Command } from 'nestjs-command';
import { Injectable, Logger } from '@nestjs/common';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';
import { ENUM_API_KEY_TYPE } from 'src/common/api-key/constants/api-key.enum.constant';
import { faker } from '@faker-js/faker';

@Injectable()
export class MigrationApiKeySeed {
    private readonly logger: Logger;

    constructor(private readonly apiKeyService: ApiKeyService) {
        this.logger = new Logger(MigrationApiKeySeed.name);
    }

    @Command({
        command: 'seed:apikey',
        describe: 'seeds apikeys',
    })
    async seeds(): Promise<void> {
        try {
            const apiKeyPublicKey = faker.string.alphanumeric(20);
            const apiKeyPublicSecret = faker.string.alphanumeric(50);
            await this.apiKeyService.createRaw({
                name: 'Api Key Public Migration',
                type: ENUM_API_KEY_TYPE.PUBLIC,
                key: apiKeyPublicKey,
                secret: apiKeyPublicSecret,
            });

            const apiKeyPrivateKey = faker.string.alphanumeric(20);
            const apiKeyPrivateSecret = faker.string.alphanumeric(50);
            await this.apiKeyService.createRaw({
                name: 'Api Key Private Migration',
                type: ENUM_API_KEY_TYPE.PRIVATE,
                key: apiKeyPrivateKey,
                secret: apiKeyPrivateSecret,
            });

            // Print key and Secret
            this.logger.log({
                key: apiKeyPublicKey,
                secret: apiKeyPublicSecret,
            });

            this.logger.log({
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
