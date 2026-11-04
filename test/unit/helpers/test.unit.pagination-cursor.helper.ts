import type { IPaginationOrderBy } from '@common/pagination/interfaces/pagination.interface';
import type { PaginationService } from '@common/pagination/services/pagination.service';
import type { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import {
    PaginationCursorEncryptionContext,
    PaginationCursorEncryptionPurpose,
} from '@common/pagination/constants/pagination.constant';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';

export function buildRawCursorToken(json: string): string {
    return Buffer.from(json).toString('base64url');
}

export function buildCursorToken(payload: unknown): string {
    return buildRawCursorToken(JSON.stringify(payload));
}

export function expectDecodeCursorError(
    service: PaginationService,
    token: string,
    fingerprint: string,
    orderBy: IPaginationOrderBy[],
    statusCode: EnumPaginationStatusCodeError
): void {
    let error: unknown = null;
    try {
        service['decodeCursor'](token, fingerprint, orderBy, 'id');
    } catch (caught) {
        error = caught;
    }

    expect(error).toMatchObject({ module: 'pagination', statusCode });
}

export function stubCursorSeal(util: MockProxy<PaginationQueryUtil>): void {
    util.sealCursor.mockImplementation(token =>
        buildCursorToken({
            ...token,
            firstPageAt: { $date: token.firstPageAt.toISOString() },
        })
    );
    util.openCursor.mockImplementation(cursor => {
        const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString());

        return {
            ...parsed,
            firstPageAt: new Date(parsed.firstPageAt?.$date ?? 0),
        };
    });
}

export function sealRawCursor(
    secret: string,
    json: unknown,
    purpose = PaginationCursorEncryptionPurpose
): string {
    const sealed = new HelperEncryptionService().aes256Encrypt(
        JSON.stringify(json),
        secret,
        purpose,
        PaginationCursorEncryptionContext
    );

    return Buffer.from(sealed).toString('base64url');
}

export function expectOpenCursorError(
    util: PaginationQueryUtil,
    token: string,
    statusCode: EnumPaginationStatusCodeError
): void {
    let error: unknown = null;
    try {
        util.openCursor(token);
    } catch (caught) {
        error = caught;
    }

    expect(error).toMatchObject({
        module: 'pagination',
        httpStatus: 422,
        statusCode,
    });
}
