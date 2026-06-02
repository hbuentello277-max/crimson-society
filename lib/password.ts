export type PasswordRequirementKey = "minLength" | "uppercase" | "lowercase" | "number";

export type PasswordRequirementChecks = Record<PasswordRequirementKey, boolean>;

export function getPasswordRequirementChecks(password: string): PasswordRequirementChecks {
  return {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
}

export function isPasswordValid(password: string) {
  const checks = getPasswordRequirementChecks(password);
  return checks.minLength && checks.uppercase && checks.lowercase && checks.number;
}

export function getPasswordValidationErrorKey(password: string): PasswordRequirementKey | null {
  const checks = getPasswordRequirementChecks(password);
  if (!checks.minLength) return "minLength";
  if (!checks.uppercase) return "uppercase";
  if (!checks.lowercase) return "lowercase";
  if (!checks.number) return "number";
  return null;
}
