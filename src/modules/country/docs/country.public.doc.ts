import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocResponsePagination,
} from '@common/doc/decorators/doc.decorator';
import { CountryResponseSchema } from '@modules/country/dtos/response/country.response.dto';
import type { CountryResponseDto } from '@modules/country/dtos/response/country.response.dto';
import {
    CountryDefaultAvailableOrderBy,
    CountryDefaultAvailableSearch,
} from '@modules/country/constants/country.list.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';

export function CountryPublicListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get all list country' }),
        DocAuth({ xApiKey: true }),
        DocResponsePagination<CountryResponseDto>('country.list', {
            schema: CountryResponseSchema,
            availableSearch: CountryDefaultAvailableSearch,
            availableOrderBy: CountryDefaultAvailableOrderBy,
            type: EnumPaginationType.cursor,
        })
    );
}
