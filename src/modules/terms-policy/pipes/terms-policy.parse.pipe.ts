import { Inject, Injectable, NotFoundException, PipeTransform, Scope } from '@nestjs/common';
import { TermsPolicyService } from '@modules/terms-policy/services/terms-policy.service';
import { TermsPolicyDoc } from '@modules/terms-policy/repository/entities/terms-policy.entity';
import { REQUEST } from '@nestjs/core';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ENUM_TERMS_POLICY_STATUS_CODE_ERROR } from '@modules/terms-policy/enums/terms-policy.status-code.enum';

@Injectable({ scope: Scope.REQUEST })
export class TermsPolicyParsePipe implements PipeTransform {
  constructor(
    @Inject(REQUEST) protected readonly request: IRequestApp,
    private readonly termsPolicyService: TermsPolicyService,
  ) {
  }

  async transform(value: string): Promise<TermsPolicyDoc> {
    const termsPolicy = await this.termsPolicyService.findOneById(value);
    if (!termsPolicy) {
      throw new NotFoundException({
        statusCode: ENUM_TERMS_POLICY_STATUS_CODE_ERROR.NOT_FOUND,
        message: 'termsPolicy.error.notFound',
      });
    }
    return termsPolicy;
  }
}

