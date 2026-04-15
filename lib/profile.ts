import { db } from "./db";

export async function getProfile() {
  return db.profile.findUnique({ where: { id: 1 } });
}
