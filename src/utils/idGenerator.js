const prisma = require('../config/prisma');

/**
 * Generate CR ID dengan format: CR-YYYY-MM-NNNNNN
 * @returns {Promise<string>} Generated CR ID
 */
async function generateCRId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `CR-${year}-${month}`;

  // Get the last CR with the same prefix
  const lastCR = await prisma.changeRequest.findFirst({
    where: {
      id: {
        startsWith: prefix,
      },
    },
    orderBy: {
      id: 'desc',
    },
  });

  let sequence = 1;
  if (lastCR) {
    const lastSequence = parseInt(lastCR.id.split('-').pop());
    sequence = lastSequence + 1;
  }

  return `${prefix}-${String(sequence).padStart(6, '0')}`;
}

module.exports = { generateCRId };
