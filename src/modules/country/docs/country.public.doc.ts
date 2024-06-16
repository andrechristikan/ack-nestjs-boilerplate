import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { CountryAllResponseDto } from 'src/modules/country/dtos/response/country.all.response.dto';

export function CountryPublicAllDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get all' }),
        DocResponse<CountryAllResponseDto>('setting.all', {
            dto: CountryAllResponseDto,
        }),
        DocAuth({ xApiKey: true })
    );
}
