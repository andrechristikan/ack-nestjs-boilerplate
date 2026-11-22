import { DatabaseService } from '@common/database/services/database.service';
import type { ITermPolicyAnalyticRepository } from '@modules/term-policy/interfaces/term-policy.analytic-repository.interface';
import type { ITermPolicyAnalyticLatest } from '@modules/term-policy/interfaces/term-policy.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';

@Injectable()
export class TermPolicyAnalyticRepository implements ITermPolicyAnalyticRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async groupLatestPublishedByTypes(
        types: EnumTermPolicyType[]
    ): Promise<ITermPolicyAnalyticLatest[]> {
        const rows = await this.databaseService.client.termPolicy.groupBy({
            by: ['type'],
            where: {
                type: { in: types },
                status: EnumTermPolicyStatus.published,
            },
            _max: { version: true },
        });

        return rows.flatMap(row =>
            row._max.version === null
                ? []
                : [{ type: row.type, version: row._max.version }]
        );
    }
}
