import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';

@Injectable()
export class ApiKeyInactiveTask {
    constructor(private readonly apiKeyService: ApiKeyService) {}

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
        name: 'inactiveApiKey',
    })
    async inactiveApiKey(): Promise<void> {
        try {
            await this.apiKeyService.inactiveManyByEndDate();
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }
}
