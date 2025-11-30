const prisma = require('../config/prisma');
const { EmailClient } = require('@azure/communication-email');
const config = require('../config');

// Socket.IO instance will be set from app.js
let io = null;

// Azure Email Client instance
let emailClient = null;

/**
 * Initialize Azure Email Client
 */
function initEmailClient() {
  if (config.azure.connectionString && config.azure.connectionString !== 'your-azure-communication-services-connection-string') {
    try {
      emailClient = new EmailClient(config.azure.connectionString);
      console.log('✅ Azure Email Client initialized');
    } catch (error) {
      console.warn('⚠️ Failed to initialize Azure Email Client:', error.message);
      emailClient = null;
    }
  } else {
    console.warn('⚠️ Azure Email not configured - email notifications disabled');
  }
}

// Initialize on module load
initEmailClient();

/**
 * Set Socket.IO instance
 * @param {object} socketIo - Socket.IO instance
 */
function setSocketIO(socketIo) {
  io = socketIo;
}

/**
 * Send email notification using Azure Communication Services
 * @param {object} options - { to, subject, htmlContent, plainTextContent }
 * @returns {Promise<object|null>} Send result or null if email not configured
 */
async function sendEmail(options) {
  if (!emailClient) {
    console.warn('⚠️ Email not sent - Azure Email Client not configured');
    return null;
  }

  const { to, subject, htmlContent, plainTextContent } = options;

  const message = {
    senderAddress: config.azure.senderAddress,
    content: {
      subject,
      plainText: plainTextContent || subject,
      html: htmlContent || `<p>${plainTextContent || subject}</p>`,
    },
    recipients: {
      to: Array.isArray(to) ? to.map(email => ({ address: email })) : [{ address: to }],
    },
  };

  try {
    const poller = await emailClient.beginSend(message);
    const result = await poller.pollUntilDone();
    console.log(`✅ Email sent to ${Array.isArray(to) ? to.join(', ') : to}`);
    return result;
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    throw error;
  }
}

/**
 * Send notification email to user
 * @param {string} userEmail - Recipient email
 * @param {object} notification - { title, message }
 */
async function sendNotificationEmail(userEmail, notification) {
  if (!emailClient || !userEmail) return;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #4F46E5; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">CR System</h1>
      </div>
      <div style="padding: 20px; background-color: #f9fafb;">
        <h2 style="color: #1f2937;">${notification.title}</h2>
        <p style="color: #4b5563; line-height: 1.6;">${notification.message}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #9ca3af; font-size: 12px;">
          This is an automated notification from CR System. Please do not reply to this email.
        </p>
      </div>
    </div>
  `;

  try {
    await sendEmail({
      to: userEmail,
      subject: `[CR System] ${notification.title}`,
      htmlContent,
      plainTextContent: `${notification.title}\n\n${notification.message}`,
    });
  } catch (error) {
    // Log but don't throw - email is secondary to in-app notification
    console.error('Failed to send notification email:', error.message);
  }
}

/**
 * Create notification for a specific user
 * @param {string} userId 
 * @param {object} data - { title, message, type, relatedId }
 * @param {boolean} sendEmailNotification - Whether to send email (default: true)
 * @returns {Promise<object>} Created notification
 */
async function notifyUser(userId, data, sendEmailNotification = true) {
  // Get user email for email notification
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

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

  // Send email notification
  if (sendEmailNotification && user?.email) {
    await sendNotificationEmail(user.email, {
      title: data.title,
      message: data.message,
    });
  }

  return notification;
}

/**
 * Notify all users with specific role
 * @param {string} role 
 * @param {object} data - { title, message, type, relatedId }
 * @param {boolean} sendEmailNotification - Whether to send email (default: true)
 */
async function notifyByRole(role, data, sendEmailNotification = true) {
  const users = await prisma.user.findMany({
    where: { role },
    select: { id: true, email: true },
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

  // Send email notifications
  if (sendEmailNotification) {
    for (const user of users) {
      if (user.email) {
        await sendNotificationEmail(user.email, {
          title: data.title,
          message: data.message,
        });
      }
    }
  }

  return notifications;
}

/**
 * Notify managers of specific division
 * @param {string} division 
 * @param {object} data - { title, message, type, relatedId }
 * @param {boolean} sendEmailNotification - Whether to send email (default: true)
 */
async function notifyManagers(division, data, sendEmailNotification = true) {
  const managers = await prisma.user.findMany({
    where: {
      role: 'MANAGER',
      division,
    },
    select: { id: true, email: true },
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

  // Send email notifications
  if (sendEmailNotification) {
    for (const manager of managers) {
      if (manager.email) {
        await sendNotificationEmail(manager.email, {
          title: data.title,
          message: data.message,
        });
      }
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
  sendEmail,
  sendNotificationEmail,
  notifyUser,
  notifyByRole,
  notifyManagers,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
