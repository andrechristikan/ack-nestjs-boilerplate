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
import type { TermPolicyContentPresignRequestDto } from '@modules/term-policy/dtos/request/term-policy.content-presign.request.dto';
import type { TermPolicyContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';
import type { ITermPolicy } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyContentHttpService } from '@modules/term-policy/services/term-policy.content.http.service';

describe('TermPolicyContentHttpService', () => {
    const termPolicyContentDomain: MockProxy<TermPolicyContentDomain> =
        mock<TermPolicyContentDomain>();
    const termPolicyDomain: MockProxy<TermPolicyDomain> =
        mock<TermPolicyDomain>();
    const policyAbilityDomain: MockProxy<PolicyAbilityDomain> =
        mock<PolicyAbilityDomain>();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const stored = {
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
        });
    });

    describe('updateContentByAdmin', () => {
        it('checks update on the loaded policy, delegates to the content domain and answers an empty envelope', async () => {
            termPolicyDomain.getOne.mockResolvedValue(stored);

            await expect(
                service.updateContentByAdmin('term-policy-id', body)
            ).resolves.toEqual({});
            expect(termPolicyDomain.getOne).toHaveBeenCalledWith(
                'term-policy-id'
            );
            expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
                EnumPolicyAction.update,
                subject(EnumPolicySubject.TermPolicy, stored)
            );
            expect(
                termPolicyContentDomain.updateContentByAdmin
            ).toHaveBeenCalledWith('term-policy-id', body);
        });

        it('throws PolicyForbiddenException and never calls the content mutation when the record is denied', async () => {
            termPolicyDomain.getOne.mockResolvedValue(stored);
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.updateContentByAdmin('term-policy-id', body)
            ).rejects.toThrow(PolicyForbiddenException);
            expect(
                termPolicyContentDomain.updateContentByAdmin
            ).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException and writes nothing when no ability is stored', async () => {
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.updateContentByAdmin('term-policy-id', body)
            ).rejects.toThrow(RequestContextMissingException);
            expect(
                termPolicyContentDomain.updateContentByAdmin
            ).not.toHaveBeenCalled();
        });
    });

    describe('addContentByAdmin', () => {
        it('checks update on the loaded policy, delegates to the content domain and answers an empty envelope', async () => {
            termPolicyDomain.getOne.mockResolvedValue(stored);

            await expect(
                service.addContentByAdmin('term-policy-id', body)
            ).resolves.toEqual({});
            expect(termPolicyDomain.getOne).toHaveBeenCalledWith(
                'term-policy-id'
            );
            expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
                EnumPolicyAction.update,
                subject(EnumPolicySubject.TermPolicy, stored)
            );
            expect(
                termPolicyContentDomain.addContentByAdmin
            ).toHaveBeenCalledWith('term-policy-id', body);
        });

        it('throws PolicyForbiddenException and never calls the content mutation when the record is denied', async () => {
            termPolicyDomain.getOne.mockResolvedValue(stored);
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.addContentByAdmin('term-policy-id', body)
            ).rejects.toThrow(PolicyForbiddenException);
            expect(
                termPolicyContentDomain.addContentByAdmin
            ).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException and writes nothing when no ability is stored', async () => {
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.addContentByAdmin('term-policy-id', body)
            ).rejects.toThrow(RequestContextMissingException);
            expect(
                termPolicyContentDomain.addContentByAdmin
            ).not.toHaveBeenCalled();
        });
    });

    describe('removeContentByAdmin', () => {
        const removeBody = { language: EnumMessageLanguage.en };

        it('checks update on the loaded policy, delegates the language to the content domain and answers an empty envelope', async () => {
            termPolicyDomain.getOne.mockResolvedValue(stored);

            await expect(
                service.removeContentByAdmin('term-policy-id', removeBody)
            ).resolves.toEqual({});
            expect(termPolicyDomain.getOne).toHaveBeenCalledWith(
                'term-policy-id'
            );
            expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
                EnumPolicyAction.update,
                subject(EnumPolicySubject.TermPolicy, stored)
            );
            expect(
                termPolicyContentDomain.removeContentByAdmin
            ).toHaveBeenCalledWith('term-policy-id', EnumMessageLanguage.en);
        });

        it('throws PolicyForbiddenException and never calls the content mutation when the record is denied', async () => {
            termPolicyDomain.getOne.mockResolvedValue(stored);
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.removeContentByAdmin('term-policy-id', removeBody)
            ).rejects.toThrow(PolicyForbiddenException);
            expect(
                termPolicyContentDomain.removeContentByAdmin
            ).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException and writes nothing when no ability is stored', async () => {
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.removeContentByAdmin('term-policy-id', removeBody)
            ).rejects.toThrow(RequestContextMissingException);
            expect(
                termPolicyContentDomain.removeContentByAdmin
            ).not.toHaveBeenCalled();
        });
    });

    describe('getContentByAdmin', () => {
        it('checks read on the loaded policy, delegates to the content domain and wraps the presign', async () => {
            const presign = mock<IAwsS3Presign>();
            termPolicyDomain.getOne.mockResolvedValue(stored);
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
            expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                subject(EnumPolicySubject.TermPolicy, stored)
            );
            expect(
                termPolicyContentDomain.getContentByAdmin
            ).toHaveBeenCalledWith('term-policy-id', EnumMessageLanguage.en);
        });

        it('throws PolicyForbiddenException and never reads the content when the record is denied', async () => {
            termPolicyDomain.getOne.mockResolvedValue(stored);
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.getContentByAdmin(
                    'term-policy-id',
                    EnumMessageLanguage.en
                )
            ).rejects.toThrow(PolicyForbiddenException);
            expect(
                termPolicyContentDomain.getContentByAdmin
            ).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException and writes nothing when no ability is stored', async () => {
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.getContentByAdmin(
                    'term-policy-id',
                    EnumMessageLanguage.en
                )
            ).rejects.toThrow(RequestContextMissingException);
            expect(
                termPolicyContentDomain.getContentByAdmin
            ).not.toHaveBeenCalled();
        });
    });
});
