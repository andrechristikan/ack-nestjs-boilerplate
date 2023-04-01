import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';
import { UserService } from 'src/modules/user/services/user.service';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';

@Injectable()
export class MigrationApiKeySeed {
    constructor(
        private readonly userService: UserService,
        private readonly apiKeyService: ApiKeyService
    ) {}

    @Command({
        command: 'seed:apikey',
        describe: 'seeds apikeys',
    })
    async seeds(): Promise<void> {
        try {
            const user: UserDoc = await this.userService.findOneByUsername(
                'superadmin'
            );
            await this.apiKeyService.createRaw(user._id, {
                name: 'Api Key Migration',
                description: 'From migration',
                key: 'qwertyuiop12345zxcvbnmkjh',
                secret: '5124512412412asdasdasdasdasdASDASDASD',
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
