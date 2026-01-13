const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidEmail(email) {
  return isNonEmptyString(email) && EMAIL_REGEX.test(email.trim().toLowerCase());
}

function isValidPassword(password) {
  return isNonEmptyString(password) && password.trim().length >= 8;
}

module.exports = {
  isNonEmptyString,
  isValidEmail,
  isValidPassword
};
