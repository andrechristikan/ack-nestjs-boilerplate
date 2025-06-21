import { Inject, Injectable, NotFoundException, PipeTransform, Scope } from '@nestjs/common';
import { TermsPolicyService } from '@modules/terms-policy/services/terms-policy.service';
import { TermsPolicyDoc } from '@modules/terms-policy/repository/entities/terms-policy.entity';
import { REQUEST } from '@nestjs/core';
import { IRequestApp } from '@common/request/interfaces/request.interface';

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
        statusCode: 'TERMS_POLICY.NOT_FOUND',
        message: 'termsPolicy.error.notFound',
      });
    }

    // Check if the policy is published (has publishedAt date and it's in the past)
    /**
    if (termsPolicy.group.) {
      throw new BadRequestException({
        statusCode: 'TERMS_POLICY.NOT_ACTIVE',
        message: 'termsPolicy.error.notActive',
      });
    }
      */
    return termsPolicy;
  }
}

