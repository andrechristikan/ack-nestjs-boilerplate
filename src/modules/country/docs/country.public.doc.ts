import { applyDecorators } from '@nestjs/common';
import {
    DocAuth,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { Doc } from '@common/doc/decorators/doc.decorator';
import {
    CountryResponseDto,
    CountryResponseSchema,
} from '@modules/country/dtos/response/country.response.dto';
import {
    CountryDefaultAvailableOrderBy,
    CountryDefaultAvailableSearch,
} from '@modules/country/constants/country.list.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';

export function CountryPublicListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get all list country' }),
        DocAuth({ xApiKey: true }),
        DocResponsePaging<CountryResponseDto>('country.list', {
            schema: CountryResponseSchema,
            availableSearch: CountryDefaultAvailableSearch,
            availableOrderBy: CountryDefaultAvailableOrderBy,
            type: EnumPaginationType.cursor,
        })
    );
}
