import { BadRequestException, Injectable } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { ENUM_TERM_POLICY_STATUS } from '@modules/term-policy/enums/term-policy.enum';
import { TermPolicyDoc } from '@modules/term-policy/repository/entities/term-policy.entity';
import { ENUM_TERM_POLICY_STATUS_CODE_ERROR } from '@modules/term-policy/enums/term-policy.status-code.enum';

@Injectable()
export class TermPolicyStatusPipe implements PipeTransform {
    private readonly allowedStatus: ENUM_TERM_POLICY_STATUS[];

    constructor(allowedStatus: ENUM_TERM_POLICY_STATUS[]) {
        this.allowedStatus = allowedStatus;
    }

    async transform(value: TermPolicyDoc): Promise<TermPolicyDoc> {
        if (!this.allowedStatus.includes(value.status)) {
            throw new BadRequestException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.INVALID_STATUS,
                message: 'termPolicy.error.invalidStatus',
            });
        }

        return value;
    }
}
