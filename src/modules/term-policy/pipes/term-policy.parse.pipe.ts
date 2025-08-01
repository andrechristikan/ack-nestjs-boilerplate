import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyDoc } from '@modules/term-policy/repository/entities/term-policy.entity';
import { ENUM_TERM_POLICY_STATUS_CODE_ERROR } from '@modules/term-policy/enums/term-policy.status-code.enum';

@Injectable()
export class TermPolicyParsePipe implements PipeTransform {
    constructor(private readonly termPolicyService: TermPolicyService) {}

    async transform(value: string): Promise<TermPolicyDoc> {
        const termPolicy = await this.termPolicyService.findOneById(value);
        if (!termPolicy) {
            throw new NotFoundException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'termPolicy.error.notFound',
            });
        }

        return termPolicy;
    }
}
