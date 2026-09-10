import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient, Role, LeadStatus, CreditStatus } from "@prisma/client";

dotenv.config();
const prisma = new PrismaClient();
const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

const secret = process.env.JWT_SECRET || "dev-secret";

function auth(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try { req.user = jwt.verify(token, secret); next(); }
  catch { return res.status(401).json({ error: "Invalid token" }); }
}

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash)))
    return res.status(401).json({ error: "Неверный email или пароль" });
  const token = jwt.sign({ id: user.id, role: user.role, dealershipId: user.dealershipId, departmentId: user.departmentId }, secret, { expiresIn: "8h" });
  res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
});

app.get("/api/dashboard", auth, async (_req, res) => {
  const [clients, leads, visits, credits, sold] = await Promise.all([
    prisma.client.count(), prisma.lead.count(), prisma.visit.count(),
    prisma.creditApplication.count(), prisma.lead.count({ where: { status: "SOLD" } })
  ]);
  res.json({ clients, leads, visits, credits, sold });
});

app.get("/api/clients", auth, async (_req, res) => {
  res.json(await prisma.client.findMany({ include: { _count: { select: { leads: true } } }, orderBy: { createdAt: "desc" } }));
});

app.post("/api/clients", auth, async (req, res) => {
  try { res.json(await prisma.client.create({ data: req.body })); }
  catch { res.status(400).json({ error: "Клиент с таким телефоном уже существует" }); }
});

app.get("/api/leads", auth, async (_req, res) => {
  res.json(await prisma.lead.findMany({
    include: { client: true, dealership: true, department: true, assignee: true, visit: true },
    orderBy: { createdAt: "desc" }
  }));
});

app.post("/api/leads", auth, async (req, res) => {
  const { phone, firstName, lastName, ...lead } = req.body;
  let client = await prisma.client.findUnique({ where: { phone } });
  if (!client) client = await prisma.client.create({ data: { phone, firstName, lastName } });
  const result = await prisma.lead.create({ data: { ...lead, clientId: client.id } });
  res.json(result);
});

app.patch("/api/leads/:id/status", auth, async (req, res) => {
  const id = Number(req.params.id);
  res.json(await prisma.lead.update({ where: { id }, data: { status: req.body.status as LeadStatus } }));
});

app.post("/api/visits", auth, async (req, res) => {
  const { leadId, dealershipId, departmentId, visitAt, comment } = req.body;
  const visit = await prisma.visit.upsert({
    where: { leadId: Number(leadId) },
    update: { dealershipId: Number(dealershipId), departmentId: Number(departmentId), visitAt: new Date(visitAt), comment },
    create: { leadId: Number(leadId), dealershipId: Number(dealershipId), departmentId: Number(departmentId), visitAt: new Date(visitAt), comment }
  });
  await prisma.lead.update({ where: { id: Number(leadId) }, data: { status: "VISIT", dealershipId: Number(dealershipId), departmentId: Number(departmentId) } });
  res.json(visit);
});

app.get("/api/dealerships", auth, async (_req, res) => {
  res.json(await prisma.dealership.findMany({ include: { departments: true } }));
});

app.get("/api/credit-applications", auth, async (_req, res) => {
  res.json(await prisma.creditApplication.findMany({ include: { client: true, lead: true }, orderBy: { createdAt: "desc" } }));
});

app.post("/api/credit-applications", auth, async (req, res) => {
  res.json(await prisma.creditApplication.create({ data: req.body }));
});

app.patch("/api/credit-applications/:id/status", auth, async (req, res) => {
  res.json(await prisma.creditApplication.update({ where: { id: Number(req.params.id) }, data: { status: req.body.status as CreditStatus } }));
});

app.get("/api/users", auth, async (_req, res) => {
  res.json(await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, dealershipId: true, departmentId: true } }));
});

app.listen(Number(process.env.PORT) || 4000, () => console.log("API started on http://localhost:4000"));
