import { subject } from '@casl/ability';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { UserChangePasswordRequestDto } from '@modules/user/dtos/request/user.change-password.request.dto';
import type { UserForgotPasswordResetRequestDto } from '@modules/user/dtos/request/user.forgot-password-reset.request.dto';
import type { UserForgotPasswordRequestDto } from '@modules/user/dtos/request/user.forgot-password.request.dto';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserPasswordDomain } from '@modules/user/domains/user.password.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserPasswordHttpService {
    constructor(
        private readonly userPasswordDomain: UserPasswordDomain,
        private readonly userDomain: UserDomain,
        private readonly policyAbilityDomain: PolicyAbilityDomain
    ) {}

    async updatePasswordByAdmin(
        userId: string,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        const user = await this.userDomain.getOne(userId);
        this.policyAbilityDomain.assertCan(
            EnumPolicyAction.update,
            subject(EnumPolicySubject.User, user)
        );
        await this.userPasswordDomain.updatePasswordByAdmin(userId, updatedBy);

        return {};
    }

    async changePassword(
        user: IUser,
        {
            newPassword,
            oldPassword,
            backupCode,
            code,
            method,
        }: UserChangePasswordRequestDto
    ): Promise<void> {
        await this.userPasswordDomain.changePassword(user, {
            newPassword,
            oldPassword,
            backupCode,
            code,
            method,
        });
    }

    async forgotPassword({
        email,
    }: UserForgotPasswordRequestDto): Promise<void> {
        await this.userPasswordDomain.forgotPassword(email);
    }

    async resetPassword({
        newPassword,
        token,
        backupCode,
        code,
        method,
    }: UserForgotPasswordResetRequestDto): Promise<void> {
        await this.userPasswordDomain.resetPassword({
            newPassword,
            token,
            backupCode,
            code,
            method,
        });
    }
}
