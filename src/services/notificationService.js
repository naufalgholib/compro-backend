const prisma = require('../config/prisma');

// Socket.IO instance will be set from app.js
let io = null;

/**
 * Set Socket.IO instance
 * @param {object} socketIo - Socket.IO instance
 */
function setSocketIO(socketIo) {
  io = socketIo;
}

/**
 * Create notification for a specific user
 * @param {string} userId 
 * @param {object} data - { title, message, type, relatedId }
 * @returns {Promise<object>} Created notification
 */
async function notifyUser(userId, data) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      title: data.title,
      message: data.message,
      type: data.type,
      relatedId: data.relatedId || null,
    },
  });

  // Emit via Socket.IO if available
  if (io) {
    io.to(`user:${userId}`).emit('notification', notification);
  }

  return notification;
}

/**
 * Notify all users with specific role
 * @param {string} role 
 * @param {object} data - { title, message, type, relatedId }
 */
async function notifyByRole(role, data) {
  const users = await prisma.user.findMany({
    where: { role },
    select: { id: true },
  });

  const notifications = await Promise.all(
    users.map((user) =>
      prisma.notification.create({
        data: {
          userId: user.id,
          title: data.title,
          message: data.message,
          type: data.type,
          relatedId: data.relatedId || null,
        },
      })
    )
  );

  // Emit via Socket.IO
  if (io) {
    for (const user of users) {
      io.to(`user:${user.id}`).emit('notification', notifications.find((n) => n.userId === user.id));
    }
  }

  return notifications;
}

/**
 * Notify managers of specific division
 * @param {string} division 
 * @param {object} data - { title, message, type, relatedId }
 */
async function notifyManagers(division, data) {
  const managers = await prisma.user.findMany({
    where: {
      role: 'MANAGER',
      division,
    },
    select: { id: true },
  });

  const notifications = await Promise.all(
    managers.map((manager) =>
      prisma.notification.create({
        data: {
          userId: manager.id,
          title: data.title,
          message: data.message,
          type: data.type,
          relatedId: data.relatedId || null,
        },
      })
    )
  );

  // Emit via Socket.IO
  if (io) {
    for (const manager of managers) {
      io.to(`user:${manager.id}`).emit('notification', notifications.find((n) => n.userId === manager.id));
    }
  }

  return notifications;
}

/**
 * Get notifications for user
 * @param {string} userId 
 * @param {object} options - { page, limit, unreadOnly }
 * @returns {Promise<object>} Notifications with pagination
 */
async function getNotifications(userId, options = {}) {
  const { page = 1, limit = 20, unreadOnly = false } = options;
  const skip = (page - 1) * limit;

  const where = { userId };
  if (unreadOnly) {
    where.isRead = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return {
    data: notifications,
    pagination: {
      page,
      limit,
      total,
    },
    unreadCount,
  };
}

/**
 * Mark notification as read
 * @param {number} notificationId 
 * @param {string} userId 
 * @returns {Promise<object>} Updated notification
 */
async function markAsRead(notificationId, userId) {
  const notification = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
    },
    data: { isRead: true },
  });

  return notification;
}

/**
 * Mark all notifications as read
 * @param {string} userId 
 */
async function markAllAsRead(userId) {
  await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: { isRead: true },
  });
}

/**
 * Get unread count for user
 * @param {string} userId 
 * @returns {Promise<number>}
 */
async function getUnreadCount(userId) {
  return prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
}

module.exports = {
  setSocketIO,
  notifyUser,
  notifyByRole,
  notifyManagers,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
