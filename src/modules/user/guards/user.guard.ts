import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { UserService } from '@modules/user/services/user.service';
import { Reflector } from '@nestjs/core';
import { UserGuardIsVerifiedMetaKey } from '@modules/user/constants/user.constant';

/**
 * Guard that validates user authentication and verification status.
 * Checks if the user is authenticated and optionally validates verification status.
 */
@Injectable()
export class UserGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly userService: UserService
    ) {}

    /**
     * Validates user authentication and verification status.
     * Extracts verification requirement from metadata and validates the user accordingly.
     *
     * @param {ExecutionContext} context - The execution context containing request information
     * @returns {Promise<boolean>} Promise that resolves to true if user is valid and meets verification requirements
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isVerified =
            this.reflector.get<boolean>(
                UserGuardIsVerifiedMetaKey,
                context.getHandler()
            ) ?? false;

        const request = context.switchToHttp().getRequest<IRequestApp>();

        const user = await this.userService.validateUserGuard(
            request,
            isVerified
        );

        request.__user = user;

        return true;
    }
}
