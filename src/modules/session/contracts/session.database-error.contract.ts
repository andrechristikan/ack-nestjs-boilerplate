import { DatabaseRecordNotFoundCode } from '@common/database/constants/database.constant';
import type { IDatabaseErrorContract } from '@common/database/interfaces/database.interface';
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';

/** @public */
export const SessionDatabaseErrorContract = {
    [DatabaseRecordNotFoundCode]: SessionNotFoundException,
} satisfies IDatabaseErrorContract;
