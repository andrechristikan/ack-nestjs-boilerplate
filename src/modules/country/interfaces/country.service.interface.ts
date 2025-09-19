import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { CountryResponseDto } from '@modules/country/dtos/response/country.response.dto';

export interface ICountryService {
    getList(
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<CountryResponseDto>>;
}
