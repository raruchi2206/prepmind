export function validatePassword(password) {
  const errors = [];
  if (password.length < 8) errors.push("Use at least 8 characters");
  if (!/[A-Z]/.test(password)) errors.push("Add an uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("Add a lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("Add a number");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("Add a special character");
  return errors;
}

export function validateRegistration({
  name,
  email,
  password,
  confirmPassword,
}) {
  const errors = {};
  if (!name.trim()) errors.name = "Full name is required";
  if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = "Enter a valid email";
  const passwordErrors = validatePassword(password);
  if (passwordErrors.length) errors.password = passwordErrors[0];
  if (password !== confirmPassword)
    errors.confirmPassword = "Passwords do not match";
  return errors;
}
