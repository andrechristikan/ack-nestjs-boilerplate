import type { IAnalyticMfaAttemptSnapshot } from '@modules/analytic/interfaces/analytic.interface';
import { MfaAnalyticRepository } from '@modules/mfa/repositories/mfa.analytic.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MfaAnalyticService {
    constructor(
        private readonly mfaAnalyticRepository: MfaAnalyticRepository
    ) {}

    async getEnabledCount(): Promise<number> {
        return await this.mfaAnalyticRepository.countEnabled();
    }

    async getAttemptSnapshot(): Promise<IAnalyticMfaAttemptSnapshot> {
        return await this.mfaAnalyticRepository.findAttemptSnapshot();
    }
}
