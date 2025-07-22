import { BadRequestException, Injectable } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { TermPolicyDoc } from '@modules/term-policy/repository/entities/term-policy.entity';
import { ENUM_TERM_POLICY_STATUS_CODE_ERROR } from '@modules/term-policy/enums/term-policy.status-code.enum';

@Injectable()
export class TermPolicyAtLeastOneDocumentPipe implements PipeTransform {
    async transform(value: TermPolicyDoc): Promise<TermPolicyDoc> {
        if (value.urls.length === 0) {
            throw new BadRequestException({
                statusCode:
                    ENUM_TERM_POLICY_STATUS_CODE_ERROR.AT_LEAST_ONE_DOCUMENT_REQUIRED,
                message: 'termPolicy.error.atLeastOneDocumentRequired',
            });
        }

        return value;
    }
}
