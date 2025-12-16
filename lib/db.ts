import fs from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export type UserRole = "admin" | "agent" | "customer";

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  active: boolean;
  createdAt: string;
};

export type ShipmentStatus =
  | "created"
  | "received"
  | "in_transit"
  | "customs"
  | "out_for_delivery"
  | "delivered"
  | "exception";

export type ShipmentEvent = {
  at: string;
  status: ShipmentStatus;
  note?: string;
};

export type ShipmentRecord = {
  id: string;
  trackingNumber: string;
  customerName: string;
  customerEmail: string;
  origin: string;
  destination: string;
  weightKg?: number;
  priceEur?: number;
  status: ShipmentStatus;
  history: ShipmentEvent[];
  createdAt: string;
  updatedAt: string;
};

export type DBShape = {
  users: UserRecord[];
  shipments: ShipmentRecord[];
};

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "db.json");

let lock: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>) {
  const run = async () => fn();
  const chained = lock.then(run, run);
  // update lock to a void promise to serialize writes
  lock = chained.then(() => undefined, () => undefined);
  return chained;
}

function now() {
  return new Date().toISOString();
}

function rid(prefix: string) {
  return prefix + "_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export async function ensureDB(): Promise<DBShape> {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    const raw = await fs.readFile(dbPath, "utf-8");
    return JSON.parse(raw) as DBShape;
  } catch {
    const adminPass = "admin123";
    const adminHash = await bcrypt.hash(adminPass, 10);
    const seed: DBShape = {
      users: [
        {
          id: rid("usr"),
          email: "admin@atlas.local",
          name: "Admin",
          role: "admin",
          passwordHash: adminHash,
          active: true,
          createdAt: now(),
        },
        {
          id: rid("usr"),
          email: "agent@atlas.local",
          name: "Operations Agent",
          role: "agent",
          passwordHash: await bcrypt.hash("agent123", 10),
          active: true,
          createdAt: now(),
        },
        {
          id: rid("usr"),
          email: "customer@atlas.local",
          name: "Demo Customer",
          role: "customer",
          passwordHash: await bcrypt.hash("customer123", 10),
          active: true,
          createdAt: now(),
        }
      ],
      shipments: [
        {
          id: rid("shp"),
          trackingNumber: "APE" + Math.random().toString().slice(2, 10),
          customerName: "Demo Customer",
          customerEmail: "customer@atlas.local",
          origin: "Spain (Madrid)",
          destination: "Morocco (Tangier)",
          weightKg: 2.4,
          priceEur: 18,
          status: "in_transit",
          history: [
            { at: now(), status: "created", note: "Shipment created" },
            { at: now(), status: "received", note: "Received at origin hub" },
            { at: now(), status: "in_transit", note: "Departed origin hub" }
          ],
          createdAt: now(),
          updatedAt: now(),
        }
      ]
    };
    await fs.writeFile(dbPath, JSON.stringify(seed, null, 2), "utf-8");
    return seed;
  }
}

export async function readDB() {
  return ensureDB();
}

export async function writeDB(db: DBShape) {
  await fs.mkdir(dataDir, { recursive: true });
  const tmp = dbPath + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf-8");
  await fs.rename(tmp, dbPath);
}

export async function updateDB<T>(fn: (db: DBShape) => Promise<T>) {
  return withLock(async () => {
    const db = await readDB();
    const result = await fn(db);
    await writeDB(db);
    return result;
  });
}

export function newShipmentTrackingNumber() {
  return "APE" + Math.random().toString().slice(2, 12);
}

export function addShipmentEvent(s: ShipmentRecord, status: ShipmentStatus, note?: string) {
  s.status = status;
  s.updatedAt = now();
  s.history.unshift({ at: now(), status, note });
}
