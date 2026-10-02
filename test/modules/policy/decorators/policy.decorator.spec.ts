import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';

import { EnumPolicyAction, EnumPolicySubject } from '@generated/prisma-client';
import { PolicyRequiredMetaKey } from '@modules/policy/constants/policy.constant';
import {
    PlatformPolicyProtected,
    PolicyAbilityProtected,
} from '@modules/policy/decorators/policy.decorator';
import { EnumPolicyAbilityScope } from '@modules/policy/enums/policy.enum';
import { PolicyGuard } from '@modules/policy/guards/policy.guard';
import { PlatformPolicyAbilityGuard } from '@modules/policy/guards/policy.platform.ability.guard';
import { ProjectPolicyAbilityGuard } from '@modules/policy/guards/policy.project.ability.guard';
import { WorkspacePolicyAbilityGuard } from '@modules/policy/guards/policy.workspace.ability.guard';
import type { IPolicyRequired } from '@modules/policy/interfaces/policy.interface';

vi.mock('@modules/policy/guards/policy.guard', () => ({
    PolicyGuard: vi.fn(),
}));
vi.mock('@modules/policy/guards/policy.platform.ability.guard', () => ({
    PlatformPolicyAbilityGuard: vi.fn(),
}));
vi.mock('@modules/policy/guards/policy.workspace.ability.guard', () => ({
    WorkspacePolicyAbilityGuard: vi.fn(),
}));
vi.mock('@modules/policy/guards/policy.project.ability.guard', () => ({
    ProjectPolicyAbilityGuard: vi.fn(),
}));

describe('policy decorators', () => {
    describe('PlatformPolicyProtected', () => {
        it('registers the platform ability guard before the policy guard and the requirement, with no scope metadata', () => {
            const handler = vi.fn();
            const required: IPolicyRequired = {
                subject: EnumPolicySubject.User,
                action: [EnumPolicyAction.read],
            };

            PlatformPolicyProtected(required)({}, 'handler', {
                value: handler,
            });

            expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
                PlatformPolicyAbilityGuard,
                PolicyGuard,
            ]);
            expect(Reflect.getMetadata(PolicyRequiredMetaKey, handler)).toEqual(
                [required]
            );
            expect(Reflect.getMetadataKeys(handler)).toEqual(
                expect.not.arrayContaining([
                    expect.stringMatching(/AbilityScope/),
                ])
            );
        });
    });

    describe('PolicyAbilityProtected', () => {
        it.each([
            [EnumPolicyAbilityScope.platform, PlatformPolicyAbilityGuard],
            [EnumPolicyAbilityScope.workspace, WorkspacePolicyAbilityGuard],
            [EnumPolicyAbilityScope.project, ProjectPolicyAbilityGuard],
        ])(
            'registers only the %s ability guard and no requirement',
            (scope, abilityGuard) => {
                const handler = vi.fn();

                PolicyAbilityProtected(scope)({}, 'handler', {
                    value: handler,
                });

                expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
                    abilityGuard,
                ]);
                expect(
                    Reflect.getMetadata(PolicyRequiredMetaKey, handler)
                ).toBeUndefined();
            }
        );
    });
});
