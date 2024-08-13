import { SetMetadata, UseGuards } from '@nestjs/common';
import {
    POLICY_ABILITY_META_KEY,
    POLICY_ROLE_META_KEY,
} from 'src/modules/policy/constants/policy.constant';
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from 'src/modules/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import { PolicyAbilityGuard } from 'src/modules/policy/guards/policy.ability.guard';
import { PolicyRoleGuard } from 'src/modules/policy/guards/policy.role.guard';

jest.mock('@nestjs/common', () => ({
    ...jest.requireActual('@nestjs/common'),
    UseGuards: jest.fn(),
    SetMetadata: jest.fn(),
}));

describe('Policy Decorators', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('PolicyAbilityProtected', () => {
        it('Should return applyDecorators with property', async () => {
            const result = PolicyAbilityProtected({
                subject: ENUM_POLICY_SUBJECT.API_KEY,
                action: [ENUM_POLICY_ACTION.READ],
            });

            expect(result).toBeTruthy();
            expect(UseGuards).toHaveBeenCalledWith(PolicyAbilityGuard);
            expect(SetMetadata).toHaveBeenCalledWith(POLICY_ABILITY_META_KEY, [
                {
                    subject: ENUM_POLICY_SUBJECT.API_KEY,
                    action: [ENUM_POLICY_ACTION.READ],
                },
            ]);
        });
    });

    describe('PolicyRoleProtected', () => {
        it('Should return applyDecorators with property', async () => {
            const result = PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN);

            expect(result).toBeTruthy();
            expect(UseGuards).toHaveBeenCalledWith(PolicyRoleGuard);
            expect(SetMetadata).toHaveBeenCalledWith(POLICY_ROLE_META_KEY, [
                ENUM_POLICY_ROLE_TYPE.ADMIN,
            ]);
        });
    });
});
