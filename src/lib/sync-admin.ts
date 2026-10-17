import { generateId } from "@better-auth/core/utils/id";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.ts";
import { account, session, user } from "../drizzle/auth-schema.ts";

export async function syncAdminAccount() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn(
      "ADMIN_EMAIL or ADMIN_PASSWORD is not set. Skipping admin account sync.",
    );
    return;
  }

  const [existingUser] = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (!existingUser) {
    const userId = generateId();
    const now = new Date();
    const hashedPassword = await hashPassword(password);

    await db.insert(user).values({
      id: userId,
      name: "Admin",
      email,
      emailVerified: true,
      role: "admin",
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(account).values({
      id: generateId(),
      userId,
      accountId: userId,
      providerId: "credential",
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    });

    console.log(`Admin account created for ${email}.`);
    return;
  }

  if (existingUser.role !== "admin") {
    await db
      .update(user)
      .set({ role: "admin", updatedAt: new Date() })
      .where(eq(user.id, existingUser.id));
    console.log(`Promoted ${email} to admin role.`);
  }

  const [credentialAccount] = await db
    .select()
    .from(account)
    .where(
      and(
        eq(account.userId, existingUser.id),
        eq(account.providerId, "credential"),
      ),
    )
    .limit(1);

  if (!credentialAccount) {
    const now = new Date();
    const hashedPassword = await hashPassword(password);

    await db.insert(account).values({
      id: generateId(),
      userId: existingUser.id,
      accountId: existingUser.id,
      providerId: "credential",
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    });

    console.log(`Admin credential account linked for ${email}.`);
    return;
  }

  if (
    credentialAccount.password &&
    (await verifyPassword({
      hash: credentialAccount.password,
      password,
    }))
  ) {
    console.log(`Admin password already in sync for ${email}.`);
    return;
  }

  const hashedPassword = await hashPassword(password);

  await db
    .update(account)
    .set({ password: hashedPassword, updatedAt: new Date() })
    .where(eq(account.id, credentialAccount.id));

  await db.delete(session).where(eq(session.userId, existingUser.id));

  console.log(`Admin password updated from ADMIN_PASSWORD for ${email}.`);
}
