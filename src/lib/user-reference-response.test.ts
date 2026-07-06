import { describe, expect, it } from 'vitest';
import { addUserEmailsToResponse } from './user-reference-response';

const resolveEmails = async (ids: Iterable<string | null | undefined>) =>
  new Map(
    [...ids]
      .filter((id): id is string => Boolean(id))
      .map((id) => [id, `${id}@example.test`])
  );

describe('addUserEmailsToResponse', () => {
  it('adds email aliases for Clerk-backed user reference fields', async () => {
    const result = await addUserEmailsToResponse(
      {
        id: 'animal_1',
        clerkUserId: 'user_creator',
        carerId: 'user_carer',
        records: [{ id: 'record_1', createdByUserId: 'user_author' }],
      },
      resolveEmails
    );

    expect(result).toEqual({
      id: 'animal_1',
      clerkUserId: 'user_creator',
      clerkUserEmail: 'user_creator@example.test',
      carerId: 'user_carer',
      carerEmail: 'user_carer@example.test',
      records: [
        {
          id: 'record_1',
          createdByUserId: 'user_author',
          createdByUserEmail: 'user_author@example.test',
        },
      ],
    });
  });

  it('does not rewrite audit-style metadata blocks', async () => {
    const result = await addUserEmailsToResponse(
      {
        id: 'audit_1',
        userId: 'user_actor',
        userEmail: null,
        metadata: { carerId: 'user_carer', targetUserId: 'user_target' },
      },
      resolveEmails
    );

    expect(result).toEqual({
      id: 'audit_1',
      userId: 'user_actor',
      userEmail: 'user_actor@example.test',
      metadata: { carerId: 'user_carer', targetUserId: 'user_target' },
    });
  });

  it('adds an email to nested carer objects selected by id', async () => {
    const result = await addUserEmailsToResponse(
      {
        animal: {
          id: 'animal_1',
          carer: { id: 'user_carer', phone: '0400 000 000' },
        },
      },
      resolveEmails
    );

    expect(result).toEqual({
      animal: {
        id: 'animal_1',
        carer: {
          id: 'user_carer',
          phone: '0400 000 000',
          email: 'user_carer@example.test',
        },
      },
    });
  });

  it('adds emails to carer objects inside plural arrays', async () => {
    const result = await addUserEmailsToResponse(
      {
        carers: [
          { id: 'user_carer_1', name: 'First Carer' },
          { id: 'user_carer_2', name: 'Second Carer', email: null },
        ],
      },
      resolveEmails
    );

    expect(result).toEqual({
      carers: [
        { id: 'user_carer_1', name: 'First Carer', email: 'user_carer_1@example.test' },
        { id: 'user_carer_2', name: 'Second Carer', email: 'user_carer_2@example.test' },
      ],
    });
  });
});
