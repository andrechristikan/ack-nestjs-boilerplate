import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import { ENUM_PAGINATION_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';
import {
    RESPONSE_CUSTOM_TIMEOUT_META_KEY,
    RESPONSE_CUSTOM_TIMEOUT_META_VALUE_KEY,
    RESPONSE_MESSAGE_PATH_META_KEY,
    RESPONSE_PAGING_TYPE_META_KEY,
    RESPONSE_SERIALIZATION_META_KEY,
    RESPONSE_MESSAGE_PROPERTIES_META_KEY,
} from '../constants/response.constant';
import { ResponseDefaultInterceptor } from '../interceptors/response.default.interceptor';
import { ResponseExcelInterceptor } from '../interceptors/response.excel.interceptor';
import { ResponsePagingInterceptor } from '../interceptors/response.paging.interceptor';
import { IResponseOptions } from '../response.interface';

export function Response(messagePath: string, options?: IResponseOptions): any {
    return applyDecorators(
        UseInterceptors(ResponseDefaultInterceptor),
        SetMetadata(RESPONSE_MESSAGE_PATH_META_KEY, messagePath),
        SetMetadata(
            RESPONSE_SERIALIZATION_META_KEY,
            options ? options.classSerialization : undefined
        ),
        SetMetadata(
            RESPONSE_MESSAGE_PROPERTIES_META_KEY,
            options ? options.messageProperties : undefined
        )
    );
}

export function ResponsePagingType(type: ENUM_PAGINATION_TYPE) {
    return applyDecorators(SetMetadata(RESPONSE_PAGING_TYPE_META_KEY, type));
}

export function ResponseExcel(options?: IResponseOptions) {
    return applyDecorators(
        UseInterceptors(ResponseExcelInterceptor),
        SetMetadata(
            RESPONSE_SERIALIZATION_META_KEY,
            options ? options.classSerialization : undefined
        ),
        SetMetadata(
            RESPONSE_MESSAGE_PROPERTIES_META_KEY,
            options ? options.messageProperties : undefined
        )
    );
}

export function ResponsePaging(
    messagePath: string,
    options?: IResponseOptions
): any {
    return applyDecorators(
        UseInterceptors(ResponsePagingInterceptor),
        SetMetadata(RESPONSE_MESSAGE_PATH_META_KEY, messagePath),
        SetMetadata(
            RESPONSE_SERIALIZATION_META_KEY,
            options ? options.classSerialization : undefined
        ),
        SetMetadata(
            RESPONSE_MESSAGE_PROPERTIES_META_KEY,
            options ? options.messageProperties : undefined
        )
    );
}

export function ResponseTimeout(seconds: string): any {
    return applyDecorators(
        SetMetadata(RESPONSE_CUSTOM_TIMEOUT_META_KEY, true),
        SetMetadata(RESPONSE_CUSTOM_TIMEOUT_META_VALUE_KEY, seconds)
    );
}
