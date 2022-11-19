import {
    applyDecorators,
    SerializeOptions,
    SetMetadata,
    UseInterceptors,
} from '@nestjs/common';
import { ENUM_HELPER_FILE_TYPE } from 'src/common/helper/constants/helper.enum.constant';
import { ENUM_PAGINATION_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';
import {
    RESPONSE_CUSTOM_TIMEOUT_META_KEY,
    RESPONSE_CUSTOM_TIMEOUT_VALUE_META_KEY,
    RESPONSE_EXCEL_TYPE_META_KEY,
    RESPONSE_MESSAGE_PATH_META_KEY,
    RESPONSE_MESSAGE_PROPERTIES_META_KEY,
    RESPONSE_PAGING_TYPE_META_KEY,
    RESPONSE_SERIALIZATION_META_KEY,
} from 'src/common/response/constants/response.constant';
import { ResponseDefaultInterceptor } from 'src/common/response/interceptors/response.default.interceptor';
import { ResponseExcelInterceptor } from 'src/common/response/interceptors/response.excel.interceptor';
import { ResponsePagingInterceptor } from 'src/common/response/interceptors/response.paging.interceptor';
import {
    IResponseOptions,
    IResponsePagingOptions,
    IResponseExcelOptions,
} from 'src/common/response/interfaces/response.interface';

export function Response<T>(
    messagePath: string,
    options?: IResponseOptions<T>
): MethodDecorator {
    return applyDecorators(
        UseInterceptors(ResponseDefaultInterceptor<T>),
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

export function ResponsePagingType(
    type: ENUM_PAGINATION_TYPE
): MethodDecorator {
    return applyDecorators(SetMetadata(RESPONSE_PAGING_TYPE_META_KEY, type));
}

export function ResponseExcel(
    options?: IResponseExcelOptions<void>
): MethodDecorator {
    return applyDecorators(
        UseInterceptors(ResponseExcelInterceptor),
        SetMetadata(
            RESPONSE_SERIALIZATION_META_KEY,
            options ? options.classSerialization : undefined
        ),
        SetMetadata(
            RESPONSE_EXCEL_TYPE_META_KEY,
            options ? options.type : ENUM_HELPER_FILE_TYPE.CSV
        ),
        SetMetadata(
            RESPONSE_MESSAGE_PROPERTIES_META_KEY,
            options ? options.messageProperties : undefined
        )
    );
}

export function ResponsePaging<T>(
    messagePath: string,
    options?: IResponsePagingOptions<T>
): MethodDecorator {
    return applyDecorators(
        UseInterceptors(ResponsePagingInterceptor<T>),
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

export function ResponseTimeout(seconds: string): MethodDecorator {
    return applyDecorators(
        SetMetadata(RESPONSE_CUSTOM_TIMEOUT_META_KEY, true),
        SetMetadata(RESPONSE_CUSTOM_TIMEOUT_VALUE_META_KEY, seconds)
    );
}

export const ResponseSerializationOptions = SerializeOptions;
