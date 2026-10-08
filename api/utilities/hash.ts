import bcrypt from 'bcrypt';

export async function hashPassword(plainPassword: string): Promise<string> {
  const saltRounds = 6; // cost factor — higher = slower but more secure
  const hash = await bcrypt.hash(plainPassword, saltRounds);
  return hash;
}

export async function verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}
