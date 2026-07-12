import { db } from "./db";

export async function getProfile(userId: number) {
  return db.profile.findUnique({ where: { userId } });
}
