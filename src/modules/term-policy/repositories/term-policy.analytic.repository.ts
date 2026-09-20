import { DatabaseService } from '@common/database/services/database.service';
import type { ITermPolicyAnalyticRepository } from '@modules/term-policy/interfaces/term-policy.analytic-repository.interface';
import { Injectable } from '@nestjs/common';
import { EnumTermPolicyStatus } from '@generated/prisma-client/client';

@Injectable()
export class TermPolicyAnalyticRepository implements ITermPolicyAnalyticRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async countPublished(): Promise<number> {
        return this.databaseService.client.termPolicy.count({
            where: { status: EnumTermPolicyStatus.published },
        });
    }
}
