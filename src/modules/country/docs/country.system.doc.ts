import { applyDecorators } from '@nestjs/common';
import {
    DocAuth,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { Doc } from '@common/doc/decorators/doc.decorator';
import { CountryListResponseDto } from '@module/country/dtos/response/country.list.response.dto';

export function CountrySystemListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get all list country' }),
        DocAuth({ xApiKey: true }),
        DocResponsePaging<CountryListResponseDto>('country.list', {
            dto: CountryListResponseDto,
        })
    );
}
