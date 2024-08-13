import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { CountryDocParamsId } from 'src/modules/country/constants/country.doc.constant';
import { CountryGetResponseDto } from 'src/modules/country/dtos/response/country.get.response.dto';
import { CountryListResponseDto } from 'src/modules/country/dtos/response/country.list.response.dto';

export function CountryAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all of countries',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<CountryListResponseDto>('country.list', {
            dto: CountryListResponseDto,
        })
    );
}

export function CountryAdminGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get detail a country',
        }),
        DocRequest({
            params: CountryDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<CountryGetResponseDto>('country.get', {
            dto: CountryGetResponseDto,
        })
    );
}
