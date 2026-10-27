import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { subject } from '@casl/ability';

import type { IAwsS3Presign } from '@common/aws/interfaces/aws.interface';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { TermPolicyContentDomain } from '@modules/term-policy/domains/term-policy.content.domain';
import { TermPolicyDomain } from '@modules/term-policy/domains/term-policy.domain';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import type { ITermPolicy } from '@modules/term-policy/interfaces/term-policy.interface';
import type { TermPolicyContentPresignRequestDto } from '@modules/term-policy/dtos/request/term-policy.content-presign.request.dto';
import type { TermPolicyContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';
import { TermPolicyContentHttpService } from '@modules/term-policy/services/term-policy.content.http.service';

describe('TermPolicyContentHttpService', () => {
    const termPolicyContentDomain: MockProxy<TermPolicyContentDomain> =
        mock<TermPolicyContentDomain>();
    const termPolicyDomain: MockProxy<TermPolicyDomain> =
        mock<TermPolicyDomain>();
    const policyAbilityDomain: MockProxy<PolicyAbilityDomain> =
        mock<PolicyAbilityDomain>();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const termPolicy = {
        id: 'term-policy-id',
        type: EnumTermPolicyType.privacy,
        version: 1,
        status: EnumTermPolicyStatus.draft,
        publishedAt: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        contents: [],
    } satisfies ITermPolicy;
    const body = {
        key: 'term-policies/privacy/v1/en.hbs',
        size: 100,
        language: EnumMessageLanguage.en,
    } satisfies TermPolicyContentRequestDto;

    let service: TermPolicyContentHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        termPolicyDomain.getOne.mockResolvedValue(termPolicy);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyContentHttpService,
                {
                    provide: TermPolicyContentDomain,
                    useValue: termPolicyContentDomain,
                },
                { provide: TermPolicyDomain, useValue: termPolicyDomain },
                { provide: PolicyAbilityDomain, useValue: policyAbilityDomain },
            ],
        }).compile();

        service = module.get(TermPolicyContentHttpService);
    });

    describe('generateContentPresignByAdmin', () => {
        it('delegates to the content domain and wraps the presign', async () => {
            const request = {
                language: EnumMessageLanguage.en,
                size: 100,
                type: EnumTermPolicyType.privacy,
                version: 1,
            } satisfies TermPolicyContentPresignRequestDto;
            const presign = mock<IAwsS3Presign>();
            termPolicyContentDomain.generateContentPresignByAdmin.mockResolvedValue(
                presign
            );

            await expect(
                service.generateContentPresignByAdmin(request)
            ).resolves.toEqual({ data: presign });
            expect(
                termPolicyContentDomain.generateContentPresignByAdmin
            ).toHaveBeenCalledWith(request);
            expect(termPolicyDomain.getOne).not.toHaveBeenCalled();
            expect(policyAbilityDomain.authorize).not.toHaveBeenCalled();
        });
    });

    describe('updateContentByAdmin', () => {
        it('loads the policy by identity, authorizes update, and writes', async () => {
            termPolicyContentDomain.updateContentByAdmin.mockResolvedValue(
                undefined
            );

            await expect(
                service.updateContentByAdmin('term-policy-id', body)
            ).resolves.toEqual({});
            expect(termPolicyDomain.getOne).toHaveBeenCalledWith(
                'term-policy-id'
            );
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.update,
                subject(EnumPolicySubject.TermPolicy, termPolicy)
            );
            expect(
                termPolicyContentDomain.updateContentByAdmin
            ).toHaveBeenCalledWith('term-policy-id', body);
        });

        it('propagates TermPolicyNotFoundException from the identity load and does not authorize or write', async () => {
            termPolicyDomain.getOne.mockRejectedValue(
                new TermPolicyNotFoundException()
            );

            await expect(
                service.updateContentByAdmin('term-policy-id', body)
            ).rejects.toThrow(TermPolicyNotFoundException);
            expect(termPolicyDomain.getOne).toHaveBeenCalledWith(
                'term-policy-id'
            );
            expect(policyAbilityDomain.authorize).not.toHaveBeenCalled();
            expect(
                termPolicyContentDomain.updateContentByAdmin
            ).not.toHaveBeenCalled();
        });

        it('throws PolicyForbiddenException from authorize after the identity load and never writes', async () => {
            policyAbilityDomain.authorize.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.updateContentByAdmin('term-policy-id', body)
            ).rejects.toThrow(PolicyForbiddenException);
            expect(termPolicyDomain.getOne).toHaveBeenCalledWith(
                'term-policy-id'
            );
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.update,
                subject(EnumPolicySubject.TermPolicy, termPolicy)
            );
            expect(
                termPolicyContentDomain.updateContentByAdmin
            ).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException from authorize after the identity load and touches nothing', async () => {
            policyAbilityDomain.authorize.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.updateContentByAdmin('term-policy-id', body)
            ).rejects.toThrow(RequestContextMissingException);
            expect(termPolicyDomain.getOne).toHaveBeenCalledWith(
                'term-policy-id'
            );
            expect(
                termPolicyContentDomain.updateContentByAdmin
            ).not.toHaveBeenCalled();
        });
    });

    describe('addContentByAdmin', () => {
        it('loads the policy by identity, authorizes update, and writes', async () => {
            termPolicyContentDomain.addContentByAdmin.mockResolvedValue(
                undefined
            );

            await expect(
                service.addContentByAdmin('term-policy-id', body)
            ).resolves.toEqual({});
            expect(termPolicyDomain.getOne).toHaveBeenCalledWith(
                'term-policy-id'
            );
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.update,
                subject(EnumPolicySubject.TermPolicy, termPolicy)
            );
            expect(
                termPolicyContentDomain.addContentByAdmin
            ).toHaveBeenCalledWith('term-policy-id', body);
        });

        it('propagates TermPolicyNotFoundException from the identity load and does not authorize or write', async () => {
            termPolicyDomain.getOne.mockRejectedValue(
                new TermPolicyNotFoundException()
            );

            await expect(
                service.addContentByAdmin('term-policy-id', body)
            ).rejects.toThrow(TermPolicyNotFoundException);
            expect(termPolicyDomain.getOne).toHaveBeenCalledWith(
                'term-policy-id'
            );
            expect(policyAbilityDomain.authorize).not.toHaveBeenCalled();
            expect(
                termPolicyContentDomain.addContentByAdmin
            ).not.toHaveBeenCalled();
        });

        it('throws PolicyForbiddenException from authorize after the identity load and never writes', async () => {
            policyAbilityDomain.authorize.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.addContentByAdmin('term-policy-id', body)
            ).rejects.toThrow(PolicyForbiddenException);
            expect(termPolicyDomain.getOne).toHaveBeenCalledWith(
                'term-policy-id'
            );
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.update,
                subject(EnumPolicySubject.TermPolicy, termPolicy)
            );
            expect(
                termPolicyContentDomain.addContentByAdmin
            ).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException from authorize after the identity load and touches nothing', async () => {
            policyAbilityDomain.authorize.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.addContentByAdmin('term-policy-id', body)
            ).rejects.toThrow(RequestContextMissingException);
            expect(termPolicyDomain.getOne).toHaveBeenCalledWith(
                'term-policy-id'
            );
            expect(
                termPolicyContentDomain.addContentByAdmin
            ).not.toHaveBeenCalled();
        });
    });

    describe('removeContentByAdmin', () => {
        it('loads the policy by identity, authorizes update, and writes', async () => {
            termPolicyContentDomain.removeContentByAdmin.mockResolvedValue(
                undefined
            );

            await expect(
                service.removeContentByAdmin('term-policy-id', {
                    language: EnumMessageLanguage.en,
                })
            ).resolves.toEqual({});
            expect(termPolicyDomain.getOne).toHaveBeenCalledWith(
                'term-policy-id'
            );
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.update,
                subject(EnumPolicySubject.TermPolicy, termPolicy)
            );
            expect(
                termPolicyContentDomain.removeContentByAdmin
            ).toHaveBeenCalledWith('term-policy-id', EnumMessageLanguage.en);
        });

        it('propagates TermPolicyNotFoundException from the identity load and does not authorize or write', async () => {
            termPolicyDomain.getOne.mockRejectedValue(
                new TermPolicyNotFoundException()
            );

            await expect(
                service.removeContentByAdmin('term-policy-id', {
                    language: EnumMessageLanguage.en,
                })
            ).rejects.toThrow(TermPolicyNotFoundException);
            expect(termPolicyDomain.getOne).toHaveBeenCalledWith(
                'term-policy-id'
            );
            expect(policyAbilityDomain.authorize).not.toHaveBeenCalled();
            expect(
                termPolicyContentDomain.removeContentByAdmin
            ).not.toHaveBeenCalled();
        });

        it('throws PolicyForbiddenException from authorize after the identity load and never writes', async () => {
            policyAbilityDomain.authorize.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.removeContentByAdmin('term-policy-id', {
                    language: EnumMessageLanguage.en,
                })
            ).rejects.toThrow(PolicyForbiddenException);
            expect(termPolicyDomain.getOne).toHaveBeenCalledWith(
                'term-policy-id'
            );
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.update,
                subject(EnumPolicySubject.TermPolicy, termPolicy)
            );
            expect(
                termPolicyContentDomain.removeContentByAdmin
            ).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException from authorize after the identity load and touches nothing', async () => {
            policyAbilityDomain.authorize.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.removeContentByAdmin('term-policy-id', {
                    language: EnumMessageLanguage.en,
                })
            ).rejects.toThrow(RequestContextMissingException);
            expect(termPolicyDomain.getOne).toHaveBeenCalledWith(
                'term-policy-id'
            );
            expect(
                termPolicyContentDomain.removeContentByAdmin
            ).not.toHaveBeenCalled();
        });
    });

    describe('getContentByAdmin', () => {
        it('loads the policy by identity, authorizes read, and reads', async () => {
            const presign = mock<IAwsS3Presign>();
            termPolicyContentDomain.getContentByAdmin.mockResolvedValue(
                presign
            );

            await expect(
                service.getContentByAdmin(
                    'term-policy-id',
                    EnumMessageLanguage.en
                )
            ).resolves.toEqual({ data: presign });
            expect(termPolicyDomain.getOne).toHaveBeenCalledWith(
                'term-policy-id'
            );
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                subject(EnumPolicySubject.TermPolicy, termPolicy)
            );
            expect(
                termPolicyContentDomain.getContentByAdmin
            ).toHaveBeenCalledWith('term-policy-id', EnumMessageLanguage.en);
        });

        it('propagates TermPolicyNotFoundException from the identity load and does not authorize or read', async () => {
            termPolicyDomain.getOne.mockRejectedValue(
                new TermPolicyNotFoundException()
            );

            await expect(
                service.getContentByAdmin(
                    'term-policy-id',
                    EnumMessageLanguage.en
                )
            ).rejects.toThrow(TermPolicyNotFoundException);
            expect(termPolicyDomain.getOne).toHaveBeenCalledWith(
                'term-policy-id'
            );
            expect(policyAbilityDomain.authorize).not.toHaveBeenCalled();
            expect(
                termPolicyContentDomain.getContentByAdmin
            ).not.toHaveBeenCalled();
        });

        it('throws PolicyForbiddenException from authorize after the identity load and never reads', async () => {
            policyAbilityDomain.authorize.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.getContentByAdmin(
                    'term-policy-id',
                    EnumMessageLanguage.en
                )
            ).rejects.toThrow(PolicyForbiddenException);
            expect(termPolicyDomain.getOne).toHaveBeenCalledWith(
                'term-policy-id'
            );
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                subject(EnumPolicySubject.TermPolicy, termPolicy)
            );
            expect(
                termPolicyContentDomain.getContentByAdmin
            ).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException from authorize after the identity load and touches nothing', async () => {
            policyAbilityDomain.authorize.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.getContentByAdmin(
                    'term-policy-id',
                    EnumMessageLanguage.en
                )
            ).rejects.toThrow(RequestContextMissingException);
            expect(termPolicyDomain.getOne).toHaveBeenCalledWith(
                'term-policy-id'
            );
            expect(
                termPolicyContentDomain.getContentByAdmin
            ).not.toHaveBeenCalled();
        });
    });
});
