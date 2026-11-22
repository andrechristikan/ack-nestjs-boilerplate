import type { EnumTermPolicyType } from '@generated/prisma-client/client';
import type { ITermPolicyAnalyticLatest } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyAnalyticRepository } from '@modules/term-policy/repositories/term-policy.analytic.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TermPolicyAnalyticService {
    constructor(
        private readonly termPolicyAnalyticRepository: TermPolicyAnalyticRepository
    ) {}

    async getLatestPublishedByTypes(
        types: EnumTermPolicyType[]
    ): Promise<ITermPolicyAnalyticLatest[]> {
        return await this.termPolicyAnalyticRepository.groupLatestPublishedByTypes(
            types
        );
    }
}
