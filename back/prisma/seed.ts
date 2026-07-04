import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth.js';

const prisma = new PrismaClient();

const main = async () => {
  await prisma.auditLog.deleteMany();
  await prisma.mastercardEvent.deleteMany();
  await prisma.donation.deleteMany();
  await prisma.session.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = hashPassword('password123');
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'auditor@example.org',
        name: 'Auditor',
        role: 'auditor',
        passwordHash,
      },
    }),
    prisma.user.create({
      data: {
        email: 'volunteer@example.org',
        name: 'Volunteer',
        role: 'volunteer',
        passwordHash,
      },
    }),
    prisma.user.create({
      data: {
        email: 'admin@example.org',
        name: 'Charity Admin',
        role: 'charity_admin',
        passwordHash,
      },
    }),
  ]);

  const now = new Date();
  const campaigns = await Promise.all([
    prisma.campaign.create({
      data: {
        name: 'Meals Today',
        cause: 'Food support',
        description: 'Fresh meals for families who need immediate help.',
        logoUrl: 'https://example.org/meals.png',
        color: '#0f766e',
        goalAmountCents: 500000,
        currency: 'EUR',
        suggestedAmounts: [500, 1000, 2500, 5000],
        status: 'active',
        startsAt: new Date(now.getTime() - 86400000),
      },
    }),
    prisma.campaign.create({
      data: {
        name: 'School Kits',
        cause: 'Education',
        description: 'Backpacks, books, and stationery for students.',
        logoUrl: 'https://example.org/school.png',
        color: '#2563eb',
        goalAmountCents: 300000,
        currency: 'EUR',
        suggestedAmounts: [1000, 2000, 3500],
        status: 'active',
        startsAt: new Date(now.getTime() - 86400000),
      },
    }),
    prisma.campaign.create({
      data: {
        name: 'Winter Beds',
        cause: 'Shelter',
        description: 'Emergency beds during cold weather.',
        logoUrl: 'https://example.org/beds.png',
        color: '#7c3aed',
        goalAmountCents: 800000,
        currency: 'EUR',
        suggestedAmounts: [1500, 3000, 6000],
        status: 'draft',
        startsAt: now,
      },
    }),
  ]);

  for (const campaign of campaigns.slice(0, 2)) {
    const donation = await prisma.donation.create({
      data: {
        campaignId: campaign.id,
        amountCents: 2500,
        currency: 'EUR',
        paymentMethod: 'card',
        status: 'succeeded',
        receiptChannel: 'email',
        receiptContactMasked: 'jo***@example.org',
        receiptQueued: true,
        mastercardDonorReference: 'donor_seed',
        mastercardEnrollmentRef: 'enroll_seed',
        mastercardTransactionId: `mc_seed_${campaign.id.slice(0, 8)}`,
        mastercardCorrelationId: `corr_seed_${campaign.id.slice(0, 8)}`,
      },
    });

    await prisma.mastercardEvent.create({
      data: {
        source: 'donate_api',
        transactionId: donation.mastercardTransactionId,
        donationId: donation.id,
        status: 'succeeded',
        amountCents: donation.amountCents,
        currency: donation.currency,
        correlationId: donation.mastercardCorrelationId ?? 'corr_seed',
        processedAt: now,
      },
    });
  }

  await prisma.auditLog.createMany({
    data: users.map((user) => ({
      userId: user.id,
      action: 'seed_created',
      entity: 'user',
      entityId: user.id,
      metadata: { email: user.email, role: user.role },
    })),
  });
};

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
