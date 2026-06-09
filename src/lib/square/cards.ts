'server-only';

import { randomUUID } from 'crypto';
import { prisma } from '../prisma';
import { getSquareClient } from './client';

// Ensure a Square Customer exists on the org's account for this member, cached
// on member.squareCustomerId. Concurrency-safe via a conditional updateMany.
export async function ensureSquareCustomer(
  accessToken: string,
  memberId: string,
  email: string
): Promise<string> {
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) throw new Error('Member not found');
  if (member.squareCustomerId) return member.squareCustomerId;

  const client = getSquareClient(accessToken);
  const res = await client.customers.create({
    idempotencyKey: `member-customer:${member.id}`,
    emailAddress: email,
    givenName: member.firstName,
    familyName: member.lastName,
    referenceId: member.id,
  });
  const customerId = res.customer?.id;
  if (!customerId) throw new Error('Square did not return a customer id');

  const claim = await prisma.member.updateMany({
    where: { id: member.id, squareCustomerId: null },
    data: { squareCustomerId: customerId },
  });
  if (claim.count === 0) {
    const winner = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    return winner.squareCustomerId ?? customerId;
  }
  return customerId;
}

// Vault a card-on-file for recurring (merchant-initiated) charges. The first
// save carries buyer verification (verificationToken); subsequent MIT charges
// against the stored card are SCA-exempt.
export async function saveCardOnFile(args: {
  accessToken: string;
  customerId: string;
  sourceId: string;
  verificationToken?: string | null;
  cardholderName?: string | null;
}): Promise<string> {
  const client = getSquareClient(args.accessToken);
  const res = await client.cards.create({
    idempotencyKey: randomUUID(),
    sourceId: args.sourceId,
    verificationToken: args.verificationToken ?? undefined,
    card: {
      customerId: args.customerId,
      cardholderName: args.cardholderName ?? undefined,
    },
  });
  const cardId = res.card?.id;
  if (!cardId) throw new Error('Square did not return a card id');
  return cardId;
}
