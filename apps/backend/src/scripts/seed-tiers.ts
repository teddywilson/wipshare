import { prisma } from '../utils/database';

async function seedTierLimits() {
  console.log('Seeding tier limits...');

  const tiers = [
    {
      tier: 'free',
      maxTracks: 10,
      maxStorageGB: 1,
      maxBandwidthGB: 5,
      maxTrackSizeMB: 50,
      maxTrackDuration: 600, // 10 minutes
      features: {
        publicTracks: true,
        privateTracks: false,
        analytics: false,
        collaboration: false,
        customBranding: false
      }
    },
    {
      tier: 'pro',
      maxTracks: 100,
      maxStorageGB: 10,
      maxBandwidthGB: 50,
      maxTrackSizeMB: 200,
      maxTrackDuration: 1800, // 30 minutes
      features: {
        publicTracks: true,
        privateTracks: true,
        analytics: true,
        collaboration: true,
        customBranding: false
      }
    },
    {
      tier: 'enterprise',
      maxTracks: -1, // unlimited
      maxStorageGB: 100,
      maxBandwidthGB: 500,
      maxTrackSizeMB: 500,
      maxTrackDuration: 7200, // 2 hours
      features: {
        publicTracks: true,
        privateTracks: true,
        analytics: true,
        collaboration: true,
        customBranding: true
      }
    }
  ];

  for (const tierData of tiers) {
    await prisma.tierLimit.upsert({
      where: { tier: tierData.tier },
      update: tierData,
      create: tierData
    });
    console.log(`✓ Created/updated ${tierData.tier} tier`);
  }

  console.log('Tier limits seeded successfully!');
}

// Run if called directly
if (require.main === module) {
  seedTierLimits()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error seeding tier limits:', error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

export { seedTierLimits };