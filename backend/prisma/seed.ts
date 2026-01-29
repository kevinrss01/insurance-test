import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const claims = [
    {
      policyNumber: 'PN-12345',
      claimType: 'auto',
      incidentDate: '2026-01-20',
      location: 'Austin, TX',
      description: 'Rear-ended at a stop light',
      estimatedAmount: 125050,
      status: 'NEW',
      attachments: JSON.stringify(['https://example.com/photo1.jpg']),
    },
    {
      policyNumber: 'PN-54321',
      claimType: 'home',
      incidentDate: '2026-01-10',
      location: 'Denver, CO',
      description: 'Water leak in the kitchen ceiling',
      estimatedAmount: 342000,
      status: 'IN_REVIEW',
      attachments: JSON.stringify(['https://example.com/leak.jpg']),
    },
    {
      policyNumber: 'PN-77777',
      claimType: 'travel',
      incidentDate: '2025-12-28',
      location: 'Miami, FL',
      description: 'Lost luggage on return flight',
      estimatedAmount: 89500,
      status: 'RESOLVED',
      attachments: JSON.stringify(['https://example.com/bag.jpg']),
    },
    {
      policyNumber: 'PN-99999',
      claimType: 'auto',
      incidentDate: '2026-01-02',
      location: 'San Jose, CA',
      description: 'Windshield cracked by debris on highway',
      estimatedAmount: 42000,
      status: 'NEW',
      attachments: JSON.stringify(['https://example.com/windshield.jpg']),
    },
  ];

  for (const claim of claims) {
    await prisma.claim.create({
      data: claim,
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
