import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.creditApplication.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.dealership.deleteMany();

  const d1 = await prisma.dealership.create({
    data: { name: "Автосалон №1", address: "Омск, ул. Автомобильная, 10", phone: "+7 3812 000-001" }
  });
  const d2 = await prisma.dealership.create({
    data: { name: "Автосалон №2", address: "Омск, ул. Центральная, 20", phone: "+7 3812 000-002" }
  });

  const sales = await prisma.department.create({ data: { name: "Продажи", dealershipId: d1.id } });
  const trade = await prisma.department.create({ data: { name: "Trade-In", dealershipId: d1.id } });
  const credit = await prisma.department.create({ data: { name: "Кредитный отдел", dealershipId: d1.id } });
  await prisma.department.create({ data: { name: "Продажи", dealershipId: d2.id } });

  const password = async (p: string) => bcrypt.hash(p, 10);

  await prisma.user.create({ data: { name: "Администратор", email: "admin@autohub.local", passwordHash: await password("admin123"), role: Role.ADMIN }});
  await prisma.user.create({ data: { name: "Оператор", email: "operator@autohub.local", passwordHash: await password("operator123"), role: Role.OPERATOR }});
  await prisma.user.create({ data: { name: "Менеджер", email: "manager@autohub.local", passwordHash: await password("manager123"), role: Role.MANAGER, dealershipId: d1.id, departmentId: sales.id }});
  await prisma.user.create({ data: { name: "Кредитный специалист", email: "credit@autohub.local", passwordHash: await password("credit123"), role: Role.CREDIT, dealershipId: d1.id, departmentId: credit.id }});

  const client = await prisma.client.create({ data: { firstName: "Иван", lastName: "Петров", phone: "+7 900 111-22-33" }});
  await prisma.lead.create({ data: {
    clientId: client.id, status: "VISIT", source: "Авито", carMake: "BMW", carModel: "X5", carYear: 2021,
    carPrice: 2850000, adUrl: "https://www.avito.ru/", comment: "Интересуется покупкой в кредит",
    dealershipId: d1.id, departmentId: sales.id
  }});

  console.log("Seed completed");
}

main().finally(() => prisma.$disconnect());
