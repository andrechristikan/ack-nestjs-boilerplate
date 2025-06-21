import { ApiTags } from '@nestjs/swagger';
import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { TermsPolicyService } from '@modules/terms-policy/services/terms-policy.service';
import { TermsPolicyGetResponseDto } from '@modules/terms-policy/dtos/response/terms-policy.get.response.dto';
import { IResponse } from '@common/response/interfaces/response.interface';
import { ENUM_TERMS_POLICY_STATUS_CODE_ERROR } from '@modules/terms-policy/enums/terms-policy.status-code.enum';
import { TermsPolicyGetRequestDto } from '@modules/terms-policy/dtos/request/terms-policy.get.request.dto';
import { TermsPolicyListRequestDto } from '@modules/terms-policy/dtos/request/terms-policy.list.request.dto';
import { TermsPolicyListResponseDto } from '@modules/terms-policy/dtos/response/terms-policy.list.response.dto';
import { TermsPolicyPublicGetDoc, TermsPolicyPublicListDoc } from '@modules/terms-policy/docs/terms-policy.public.doc';
import { Response } from '@common/response/decorators/response.decorator';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@common/pagination/enums/pagination.enum';

@ApiTags('modules.public.terms-policy')
@Controller({
  version: '1',
  path: '/terms-policy',
})
export class TermsPolicyPublicController {
  constructor(
    private readonly termsPolicyService: TermsPolicyService,
  ) {
  }

  @TermsPolicyPublicListDoc()
  @Get('/:lang')
  @Response('terms-policy.list')
  async getList(
    @Param() request: TermsPolicyListRequestDto,
  ): Promise<IResponse<TermsPolicyListResponseDto[]>> {
    // Get all different types of policies with their latest published versions for the specified language
    const policies = await this.termsPolicyService.findLatestPublishedByLanguage(request.lang);

    return {
      data: this.termsPolicyService.mapList(policies),
    };
  }

  @TermsPolicyPublicGetDoc()
  @Get('/:lang/:type')
  @Response('terms-policy.get')
  async getLatest(
    @Param() request: TermsPolicyGetRequestDto,
  ): Promise<IResponse<TermsPolicyGetResponseDto>> {
    const policy = await this.termsPolicyService.findOnePublished(
      { type: request.type, language: request.lang },
      {
        order: {
          publishedAt: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
          version: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
        },
      },
    );

    if (!policy) {
      throw new NotFoundException(
        {
          statusCode: ENUM_TERMS_POLICY_STATUS_CODE_ERROR.NOT_FOUND,
          message: 'terms-policy.error.notFound',
        },
      );
    }

    return {
      data: this.termsPolicyService.mapGet(policy),
    };
  }
}
