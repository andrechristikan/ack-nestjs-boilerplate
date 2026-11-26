import { Prisma } from '@generated/prisma-client/client';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import {
    DatabaseRecordNotFoundCode,
    DatabaseUniqueConstraintCode,
} from '@common/database/constants/database.constant';
import type {
    IDatabaseErrorContract,
    IDatabaseScalarField,
} from '@common/database/interfaces/database.interface';
import type { DatabaseUtil } from '@common/database/utils/database.util';

export abstract class DatabaseRepositoryBase {
    protected abstract readonly databaseUtil: DatabaseUtil;
    protected abstract readonly errorContract: IDatabaseErrorContract;

    /** Returns, never throws: an `AppBaseException` it receives, as is; else a new instance of the class the contract names for the error's code or its P2002 field; else `AppUnknownException` carrying the error. */
    protected toException(error: unknown): AppBaseException {
        if (error instanceof AppBaseException) {
            return error;
        }

        const recordNotFound = this.errorContract[DatabaseRecordNotFoundCode];
        if (
            recordNotFound &&
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === DatabaseRecordNotFoundCode
        ) {
            return new recordNotFound();
        }

        const uniqueConstraint =
            this.errorContract[DatabaseUniqueConstraintCode];
        if (uniqueConstraint) {
            const fields = Object.keys(
                uniqueConstraint
            ) as IDatabaseScalarField[];
            const field = fields.find(entry =>
                this.databaseUtil.isUniqueCollision(error, entry)
            );
            const collision = field && uniqueConstraint[field];
            if (collision) {
                return new collision();
            }
        }

        return new AppUnknownException(error);
    }
}
