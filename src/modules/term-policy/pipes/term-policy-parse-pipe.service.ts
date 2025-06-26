import { Inject, Injectable, NotFoundException, PipeTransform, Scope } from '@nestjs/common';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyDoc } from '@modules/term-policy/repository/entities/term-policy.entity';
import { REQUEST } from '@nestjs/core';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ENUM_TERM_POLICY_STATUS_CODE_ERROR } from '@modules/term-policy/enums/term-policy.status-code.enum';

@Injectable({ scope: Scope.REQUEST })
export class TermPolicyParsePipe implements PipeTransform {
  constructor(
    @Inject(REQUEST) protected readonly request: IRequestApp,
    private readonly termPolicyService: TermPolicyService,
  ) {
  }

  async transform(value: string): Promise<TermPolicyDoc> {
    const termPolicy = await this.termPolicyService.findOneById(value);
    if (!termPolicy) {
      throw new NotFoundException({
        statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.NOT_FOUND,
        message: 'term-policy.error.notFound',
      });
    }
    return termPolicy;
  }
}

