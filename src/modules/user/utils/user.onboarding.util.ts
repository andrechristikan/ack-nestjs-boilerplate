import { DatabaseUtil } from '@common/database/utils/database.util';
import { UserEmailExistException } from '@modules/user/exceptions/user.email-exist.exception';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';
import { Injectable } from '@nestjs/common';

/** Maps the collision raised by the onboarding create onto its user exception. */
@Injectable()
export class UserOnboardingUtil {
    constructor(private readonly databaseUtil: DatabaseUtil) {}

    /** Translates a unique collision raised by the onboarding create into its user exception, returning anything else untouched. */
    mapCreateCollision(error: unknown): unknown {
        if (this.databaseUtil.isUniqueCollision(error, 'username')) {
            return new UserUsernameExistException();
        } else if (this.databaseUtil.isUniqueCollision(error, 'email')) {
            return new UserEmailExistException();
        }

        return error;
    }
}
