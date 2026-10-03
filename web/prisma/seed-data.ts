// Development seed, ported from backend/database/seeders. Unlike the legacy
// CadastroSeeder (random factory data, duplicated on every run), the data here
// is fixed and every record is looked up before being created, so running the
// seed again changes nothing.
import type { PrismaClient } from "@/generated/prisma/client";
import { hashPassword } from "@/lib/password";

// Dev-only password for every seeded user (same as the legacy seeders).
export const SEED_PASSWORD = "senha123";

const PLANS = [
  {
    name: "Básico",
    description: "Plano de entrada, com limite de barbeiros e clientes.",
    monthlyPrice: "49.90",
    maxProfessionals: 2,
    maxCustomers: 100,
  },
  {
    name: "Premium",
    description: "Plano sem limites de barbeiros ou clientes.",
    monthlyPrice: "129.90",
    maxProfessionals: null,
    maxCustomers: null,
  },
];

const SERVICES = [
  { name: "Corte", durationMinutes: 30, price: "45.00" },
  { name: "Barba", durationMinutes: 30, price: "35.00" },
  { name: "Corte + Barba", durationMinutes: 60, price: "70.00" },
  { name: "Sobrancelha", durationMinutes: 20, price: "20.00" },
];

const PRODUCTS = [
  { name: "Pomada modeladora", price: "39.90", stockQuantity: 20 },
  { name: "Óleo para barba", price: "49.90", stockQuantity: 15 },
  { name: "Shampoo", price: "29.90", stockQuantity: 30 },
];

type TenantSeed = {
  slug: string;
  name: string;
  plan: string;
  phone: string;
  address: string;
  status: "active" | "trial";
  trialDays?: number;
  adminEmail: string;
  adminName: string;
  professionals: { name: string; email: string; commissionRate: string }[];
  customers: { name: string; phone: string; email?: string; birthDate?: string }[];
};

const TENANTS: TenantSeed[] = [
  {
    slug: "barbearia-centro",
    name: "Barbearia Centro",
    plan: "Básico",
    phone: "(11) 90000-0001",
    address: "Rua Principal, 100 - Centro",
    status: "active",
    adminEmail: "admin@barbearia-centro.com",
    adminName: "Admin Barbearia Centro",
    professionals: [
      { name: "Carlos Souza", email: "carlos@barbearia-centro.com", commissionRate: "40.00" },
      { name: "Rafael Lima", email: "rafael@barbearia-centro.com", commissionRate: "35.00" },
    ],
    customers: [
      { name: "João Pereira", phone: "(11) 91111-0001", email: "joao@example.com", birthDate: "1990-03-15" },
      { name: "Pedro Alves", phone: "(11) 91111-0002" },
      { name: "Lucas Martins", phone: "(11) 91111-0003", birthDate: "1985-11-02" },
      { name: "Mateus Rocha", phone: "(11) 91111-0004", email: "mateus@example.com" },
      { name: "Gabriel Costa", phone: "(11) 91111-0005", birthDate: "2000-07-21" },
      { name: "Thiago Ribeiro", phone: "(11) 91111-0006" },
    ],
  },
  {
    slug: "barbearia-zona-sul",
    name: "Barbearia Zona Sul",
    plan: "Premium",
    phone: "(11) 90000-0002",
    address: "Av. das Palmeiras, 500 - Zona Sul",
    status: "trial",
    trialDays: 14,
    adminEmail: "admin@barbearia-zona-sul.com",
    adminName: "Admin Barbearia Zona Sul",
    professionals: [
      { name: "Bruno Ferreira", email: "bruno@barbearia-zona-sul.com", commissionRate: "40.00" },
      { name: "Diego Santos", email: "diego@barbearia-zona-sul.com", commissionRate: "50.00" },
    ],
    customers: [
      { name: "André Gomes", phone: "(11) 92222-0001", email: "andre@example.com", birthDate: "1992-01-30" },
      { name: "Felipe Barros", phone: "(11) 92222-0002" },
      { name: "Rodrigo Nunes", phone: "(11) 92222-0003", birthDate: "1988-09-12" },
      { name: "Vinícius Dias", phone: "(11) 92222-0004", email: "vinicius@example.com" },
      { name: "Eduardo Lopes", phone: "(11) 92222-0005", birthDate: "1995-05-05" },
      { name: "Marcelo Teixeira", phone: "(11) 92222-0006" },
    ],
  },
];

// Monday (1) to Friday (5), 09:00–18:00, like the legacy CadastroSeeder.
const WORK_DAYS = [1, 2, 3, 4, 5];
const WORK_START = new Date("1970-01-01T09:00:00Z");
const WORK_END = new Date("1970-01-01T18:00:00Z");

// Better Auth keeps email/password logins in `accounts` (providerId "credential",
// accountId = user id), not on the user row (ADR-0004).
async function ensureCredentialAccount(db: PrismaClient, userId: number, passwordHash: string): Promise<void> {
  await db.account.upsert({
    where: { providerId_accountId: { providerId: "credential", accountId: String(userId) } },
    update: {},
    create: { providerId: "credential", accountId: String(userId), userId, password: passwordHash },
  });
}

export async function seed(db: PrismaClient): Promise<void> {
  const passwordHash = await hashPassword(SEED_PASSWORD);

  const superAdmin = await db.user.upsert({
    where: { email: "superadmin@agenda.com" },
    update: {},
    create: { name: "Super Admin", email: "superadmin@agenda.com", role: "super_admin" },
  });
  await ensureCredentialAccount(db, superAdmin.id, passwordHash);

  const planIds = new Map<string, number>();
  for (const plan of PLANS) {
    const existing = await db.plan.findFirst({ where: { name: plan.name } });
    const record = existing ?? (await db.plan.create({ data: plan }));
    planIds.set(plan.name, record.id);
  }

  for (const t of TENANTS) {
    const tenant = await db.tenant.upsert({
      where: { slug: t.slug },
      update: {},
      create: {
        slug: t.slug,
        name: t.name,
        planId: planIds.get(t.plan)!,
        phone: t.phone,
        address: t.address,
        status: t.status,
        trialEndsAt: t.trialDays ? new Date(Date.now() + t.trialDays * 24 * 60 * 60 * 1000) : null,
      },
    });

    const admin = await db.user.upsert({
      where: { email: t.adminEmail },
      update: {},
      create: { name: t.adminName, email: t.adminEmail, role: "admin", tenantId: tenant.id },
    });
    await ensureCredentialAccount(db, admin.id, passwordHash);

    const serviceIds: number[] = [];
    for (const service of SERVICES) {
      const existing = await db.service.findFirst({ where: { tenantId: tenant.id, name: service.name } });
      const record = existing ?? (await db.service.create({ data: { ...service, tenantId: tenant.id } }));
      serviceIds.push(record.id);
    }

    for (const product of PRODUCTS) {
      const existing = await db.product.findFirst({ where: { tenantId: tenant.id, name: product.name } });
      if (!existing) {
        await db.product.create({ data: { ...product, tenantId: tenant.id } });
      }
    }

    for (const customer of t.customers) {
      const existing = await db.customer.findFirst({ where: { tenantId: tenant.id, phone: customer.phone } });
      if (!existing) {
        await db.customer.create({
          data: {
            tenantId: tenant.id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email ?? null,
            birthDate: customer.birthDate ? new Date(`${customer.birthDate}T00:00:00Z`) : null,
          },
        });
      }
    }

    for (const p of t.professionals) {
      const user = await db.user.upsert({
        where: { email: p.email },
        update: {},
        create: {
          name: p.name,
          email: p.email,
          role: "professional",
          tenantId: tenant.id,
          emailVerified: true,
        },
      });
      await ensureCredentialAccount(db, user.id, passwordHash);

      const professional = await db.professional.upsert({
        where: { userId: user.id },
        update: {},
        create: { tenantId: tenant.id, userId: user.id, defaultCommissionRate: p.commissionRate },
      });

      // Every professional offers every service, with no per-professional overrides.
      await db.professionalService.createMany({
        data: serviceIds.map((serviceId) => ({ professionalId: professional.id, serviceId })),
        skipDuplicates: true,
      });

      const hasHours = await db.workingHour.count({ where: { professionalId: professional.id } });
      if (hasHours === 0) {
        await db.workingHour.createMany({
          data: WORK_DAYS.map((weekday) => ({
            professionalId: professional.id,
            weekday,
            startTime: WORK_START,
            endTime: WORK_END,
          })),
        });
      }
    }
  }
}
