const prisma = require('../config/prisma');

/**
 * Get dashboard statistics based on user role
 * @param {object} user 
 * @returns {Promise<object>} Dashboard data
 */
async function getDashboard(user) {
  const baseStats = {
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      division: user.division,
    },
  };

  switch (user.role) {
    case 'USER':
      return getUserDashboard(user, baseStats);
    case 'MANAGER':
      return getManagerDashboard(user, baseStats);
    case 'VP':
      return getVPDashboard(user, baseStats);
    case 'MANAGER_IT':
      return getManagerITDashboard(user, baseStats);
    case 'DEV':
      return getDeveloperDashboard(user, baseStats);
    default:
      return baseStats;
  }
}

/**
 * User Dashboard
 */
async function getUserDashboard(user, baseStats) {
  const [totalCRs, statusCounts, recentCRs] = await Promise.all([
    // Total CRs
    prisma.changeRequest.count({
      where: { userId: user.id, status: { not: 'DELETED' } },
    }),
    // Status counts
    prisma.changeRequest.groupBy({
      by: ['status'],
      where: { userId: user.id, status: { not: 'DELETED' } },
      _count: true,
    }),
    // Recent CRs
    prisma.changeRequest.findMany({
      where: { userId: user.id, status: { not: 'DELETED' } },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        status: true,
        formData: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const statusMap = statusCounts.reduce((acc, item) => {
    acc[item.status] = item._count;
    return acc;
  }, {});

  return {
    ...baseStats,
    stats: {
      total: totalCRs,
      draft: statusMap.DRAFT || 0,
      pending: (statusMap.PENDING_MANAGER || 0) + (statusMap.PENDING_VP || 0),
      revision: (statusMap.REVISION_MANAGER || 0) + (statusMap.REVISION_VP || 0),
      approved: statusMap.APPROVED || 0,
      rejected: (statusMap.REJECTED_MANAGER || 0) + (statusMap.REJECTED_VP || 0),
      completed: statusMap.COMPLETED || 0,
    },
    recentCRs: recentCRs.map((cr) => ({
      id: cr.id,
      title: cr.formData.title,
      status: cr.status,
      createdAt: cr.createdAt,
      updatedAt: cr.updatedAt,
    })),
  };
}

/**
 * Manager Dashboard
 */
async function getManagerDashboard(user, baseStats) {
  const [pendingApproval, divisionStats, recentCRs] = await Promise.all([
    // Pending approval count
    prisma.changeRequest.count({
      where: {
        status: 'PENDING_MANAGER',
        user: { division: user.division },
      },
    }),
    // Division stats
    prisma.changeRequest.groupBy({
      by: ['status'],
      where: {
        user: { division: user.division },
        status: { not: 'DELETED' },
      },
      _count: true,
    }),
    // Recent CRs needing approval
    prisma.changeRequest.findMany({
      where: {
        status: 'PENDING_MANAGER',
        user: { division: user.division },
      },
      orderBy: { createdAt: 'asc' },
      take: 10,
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    }),
  ]);

  const statusMap = divisionStats.reduce((acc, item) => {
    acc[item.status] = item._count;
    return acc;
  }, {});

  return {
    ...baseStats,
    stats: {
      pendingApproval,
      totalDivision: Object.values(statusMap).reduce((a, b) => a + b, 0),
      approved: statusMap.APPROVED || 0,
      rejected: (statusMap.REJECTED_MANAGER || 0) + (statusMap.REJECTED_VP || 0),
    },
    pendingCRs: recentCRs.map((cr) => ({
      id: cr.id,
      title: cr.formData.title,
      requester: cr.user.name,
      createdAt: cr.createdAt,
    })),
  };
}

/**
 * VP Dashboard
 */
async function getVPDashboard(user, baseStats) {
  const [pendingApproval, statusCounts, divisionBreakdown, recentCRs] = await Promise.all([
    // Pending VP approval
    prisma.changeRequest.count({
      where: { status: 'PENDING_VP' },
    }),
    // Overall status counts
    prisma.changeRequest.groupBy({
      by: ['status'],
      where: { status: { not: 'DELETED' } },
      _count: true,
    }),
    // Division breakdown
    prisma.changeRequest.groupBy({
      by: ['status'],
      where: { status: 'PENDING_VP' },
      _count: true,
    }),
    // Recent pending CRs
    prisma.changeRequest.findMany({
      where: { status: 'PENDING_VP' },
      orderBy: { createdAt: 'asc' },
      take: 10,
      include: {
        user: {
          select: { name: true, division: true },
        },
      },
    }),
  ]);

  const statusMap = statusCounts.reduce((acc, item) => {
    acc[item.status] = item._count;
    return acc;
  }, {});

  return {
    ...baseStats,
    stats: {
      pendingApproval,
      totalAll: Object.values(statusMap).reduce((a, b) => a + b, 0),
      approved: statusMap.APPROVED || 0,
      assigned: statusMap.ASSIGNED_DEV || 0,
      completed: statusMap.COMPLETED || 0,
    },
    pendingCRs: recentCRs.map((cr) => ({
      id: cr.id,
      title: cr.formData.title,
      requester: cr.user.name,
      division: cr.user.division,
      createdAt: cr.createdAt,
    })),
  };
}

/**
 * Manager IT Dashboard
 */
async function getManagerITDashboard(user, baseStats) {
  const [needMapping, developerWorkload, recentCRs] = await Promise.all([
    // CRs needing mapping
    prisma.changeRequest.count({
      where: { status: 'APPROVED' },
    }),
    // Developer workload
    prisma.developerAssignment.groupBy({
      by: ['developerId'],
      _count: true,
    }),
    // Recent approved CRs
    prisma.changeRequest.findMany({
      where: { status: 'APPROVED' },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: { name: true, division: true },
        },
      },
    }),
  ]);

  // Get developer names
  const developerIds = developerWorkload.map((d) => d.developerId);
  const developers = await prisma.user.findMany({
    where: { id: { in: developerIds } },
    select: { id: true, name: true },
  });

  const workloadWithNames = developerWorkload.map((w) => ({
    developer: developers.find((d) => d.id === w.developerId)?.name || 'Unknown',
    assignedCRs: w._count,
  }));

  return {
    ...baseStats,
    stats: {
      needMapping,
      totalAssigned: developerWorkload.reduce((sum, d) => sum + d._count, 0),
    },
    developerWorkload: workloadWithNames,
    pendingCRs: recentCRs.map((cr) => ({
      id: cr.id,
      title: cr.formData.title,
      requester: cr.user.name,
      division: cr.user.division,
      updatedAt: cr.updatedAt,
    })),
  };
}

/**
 * Developer Dashboard
 */
async function getDeveloperDashboard(user, baseStats) {
  const [assignedCRs, completedCount] = await Promise.all([
    // Assigned CRs
    prisma.developerAssignment.findMany({
      where: { developerId: user.id },
      include: {
        changeRequest: {
          include: {
            user: {
              select: { name: true, division: true },
            },
          },
        },
        assignedBy: {
          select: { name: true },
        },
      },
      orderBy: { assignedAt: 'desc' },
    }),
    // Completed count
    prisma.changeRequest.count({
      where: {
        status: 'COMPLETED',
        developerAssignments: {
          some: { developerId: user.id },
        },
      },
    }),
  ]);

  return {
    ...baseStats,
    stats: {
      assigned: assignedCRs.length,
      completed: completedCount,
      inProgress: assignedCRs.filter((a) => a.changeRequest.status === 'ASSIGNED_DEV').length,
    },
    assignedCRs: assignedCRs.map((a) => ({
      id: a.changeRequest.id,
      title: a.changeRequest.formData.title,
      status: a.changeRequest.status,
      requester: a.changeRequest.user.name,
      division: a.changeRequest.user.division,
      assignedBy: a.assignedBy.name,
      assignedAt: a.assignedAt,
      targetDate: a.changeRequest.formData.targetDate,
      notes: a.notes,
    })),
  };
}

module.exports = {
  getDashboard,
};
