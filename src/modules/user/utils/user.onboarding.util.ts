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
        const isUsernameCollision = this.databaseUtil.isUniqueCollision(
            error,
            'username'
        );
        if (isUsernameCollision) {
            return new UserUsernameExistException();
        }

        const isEmailCollision = this.databaseUtil.isUniqueCollision(
            error,
            'email'
        );
        if (isEmailCollision) {
            return new UserEmailExistException();
        }

        return error;
    }
}
