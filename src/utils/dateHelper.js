/**
 * Format date to Indonesian locale
 * @param {Date} date 
 * @returns {string}
 */
function formatDateID(date) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

/**
 * Format date time to Indonesian locale
 * @param {Date} date 
 * @returns {string}
 */
function formatDateTimeID(date) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/**
 * Format date to ISO string (YYYY-MM-DD)
 * @param {Date} date 
 * @returns {string}
 */
function formatDateISO(date) {
  return new Date(date).toISOString().split('T')[0];
}

/**
 * Check if date is in the past
 * @param {Date} date 
 * @returns {boolean}
 */
function isDateInPast(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(date) < today;
}

/**
 * Add business days to a date
 * @param {Date} date 
 * @param {number} days 
 * @returns {Date}
 */
function addBusinessDays(date, days) {
  const result = new Date(date);
  let addedDays = 0;
  
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      addedDays++;
    }
  }
  
  return result;
}

module.exports = {
  formatDateID,
  formatDateTimeID,
  formatDateISO,
  isDateInPast,
  addBusinessDays,
};
