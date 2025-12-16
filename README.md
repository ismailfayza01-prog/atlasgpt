# Atlas Parcel Europe — Supabase Edition (MVP)

This repo upgrades the HTML preview into a working MVP backed by **Supabase (Postgres + Auth + Realtime + Storage)**.

## What you get
- **Real accounts** (Supabase Auth): sign up, login, logout
- **Roles**: admin / agent / customer (via `profiles.role`)
- **Shipment Management**: create/list/update status + event history
- **User Management** (admin): list users, change role, disable account (soft)
- **Analytics**: counts + basic status chart
- **Labels + Invoices**: generated as PDF in the browser and uploaded to Supabase Storage
- **CSV import/export** for shipments
- **Driver/Rider live tracking**: rider phone pushes GPS points to Postgres; dispatch subscribes via Supabase Realtime and displays a live map

---

## 1) Create Supabase project
1. Create a new project in Supabase.
2. In **Project Settings → API**, copy:
   - `Project URL`
   - `anon public key`

## 2) Configure environment variables
Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

## 3) Apply database schema
Open Supabase **SQL Editor** and run the SQL in:

- `supabase/schema.sql`

That creates tables, triggers, indexes, RLS policies, and a few helper functions.

## 4) Create a Storage bucket for PDFs
Supabase **Storage → Create bucket**:
- Bucket name: `documents`
- Public: **ON** (simplest for MVP)

Then run the Storage policies in `supabase/storage_policies.sql`.

## 5) Create your first admin
After you sign up with your email:
- In Supabase **Table Editor → profiles**, set your `role` to `admin`.

(For a faster MVP flow, you can also disable email confirmation in Supabase Auth settings.)

## 6) Install and run locally
```bash
npm install
npm run dev
```

Open: http://localhost:3000

---

## App routes
- `/` dashboard
- `/login` `/signup`
- `/shipments` (role-aware)
- `/admin` (admin only)
- `/track` public shipment tracking by tracking code
- `/rider` rider GPS uploader (works best on mobile)
- `/dispatch` live map for agent/admin
- `/docs/label/[shipmentId]` generate/upload label PDF
- `/docs/invoice/[shipmentId]` generate/upload invoice PDF

---

## CSV formats
Export uses a standard set of columns.

Import expects at minimum:
- `tracking_code` (optional; if blank we auto-generate)
- `customer_email` (optional; if blank, assigns to current user if customer, else leaves null)
- `origin`, `destination`, `weight_kg`, `price_amount`, `currency`, `status`, `notes`

You can download a template from **Shipments → Import**.

---

## Notes / limitations (MVP)
- Pricing, taxes, invoice numbering are basic and meant to be extended.
- Map uses OpenStreetMap tiles (no API key required).
- For production: set Storage to private, use signed URLs, add auditing, and stricter RLS.
