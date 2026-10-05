import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { Response } from 'express';
import { of } from 'rxjs';
import type { Observable } from 'rxjs';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';

export function buildResultSchema(
    result: StandardSchemaV1.Result<unknown>
): StandardSchemaV1 {
    return {
        '~standard': {
            version: 1,
            vendor: 'test',
            validate: () => result,
        },
    };
}

export function buildPassThroughSchema(): StandardSchemaV1 {
    return {
        '~standard': {
            version: 1,
            vendor: 'test',
            validate: (item: unknown) => ({ value: item }),
        },
    };
}

export function buildPaginationEmission(
    responseData: IResponsePaginationReturn<unknown>
): Observable<Promise<Response>> {
    return of(Promise.resolve(responseData as unknown as Response));
}
