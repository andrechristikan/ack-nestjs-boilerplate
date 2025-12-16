import { applyDecorators } from '@nestjs/common';
import {
    DocAuth,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { Doc } from '@common/doc/decorators/doc.decorator';
import { CountryResponseDto } from '@modules/country/dtos/response/country.response.dto';
import { CountryDefaultAvailableSearch } from '@modules/country/constants/country.list.constant';

export function CountryPublicListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get all list country' }),
        DocAuth({ xApiKey: true }),
        DocResponsePaging<CountryResponseDto>('country.list', {
            dto: CountryResponseDto,
            availableSearch: CountryDefaultAvailableSearch,
        })
    );
}
