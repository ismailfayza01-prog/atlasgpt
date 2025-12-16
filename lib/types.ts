export type Role = "admin" | "agent" | "customer" | "rider";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  is_disabled: boolean;
  created_at: string;
};

export type ShipmentStatus =
  | "requested"
  | "created"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type Shipment = {
  id: string;
  tracking_code: string;
  customer_id: string | null;
  origin: string | null;
  destination: string | null;
  status: ShipmentStatus;
  weight_kg: number | null;
  price_amount: number | null;
  currency: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ShipmentEvent = {
  id: number;
  shipment_id: string;
  status: ShipmentStatus;
  location: string | null;
  note: string | null;
  actor_id: string | null;
  created_at: string;
};

export type RiderPosition = {
  id: number;
  rider_id: string;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  speed_mps: number | null;
  heading_deg: number | null;
  recorded_at: string;
};
