-- Integrity rules that Prisma's schema language cannot express.
-- These are the last line of defence: services check first, the database guarantees.
-- Documented in docs/DATABASE.md.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ── Inventory: a departure can never be oversold ───────────────────────────
ALTER TABLE "TripDeparture"
  ADD CONSTRAINT "TripDeparture_counts_nonnegative" CHECK ("capacity" >= 0 AND "soldCount" >= 0 AND "heldCount" >= 0),
  ADD CONSTRAINT "TripDeparture_no_overbooking" CHECK ("soldCount" + "heldCount" <= "capacity"),
  ADD CONSTRAINT "TripDeparture_return_after_depart" CHECK ("returnAt" IS NULL OR "returnAt" > "departAt");

ALTER TABLE "CapacityHold"
  ADD CONSTRAINT "CapacityHold_quantity_positive" CHECK ("quantity" > 0);

-- A physical seat can be held/booked by at most one order per departure.
CREATE UNIQUE INDEX "SeatReservation_active_seat_unique"
  ON "SeatReservation" ("departureId", "seatId")
  WHERE "status" IN ('HELD', 'BOOKED');

ALTER TABLE "DepartureFare"
  ADD CONSTRAINT "DepartureFare_price_nonnegative" CHECK ("priceCents" >= 0);

ALTER TABLE "DepartureStop"
  ADD CONSTRAINT "DepartureStop_surcharge_nonnegative" CHECK ("surchargeCents" >= 0);

-- ── Money ───────────────────────────────────────────────────────────────────
ALTER TABLE "Order"
  ADD CONSTRAINT "Order_amounts_nonnegative" CHECK (
    "subtotalCents" >= 0 AND "discountCents" >= 0 AND "feesCents" >= 0 AND "taxCents" >= 0 AND "totalCents" >= 0),
  ADD CONSTRAINT "Order_total_consistent" CHECK ("totalCents" = "subtotalCents" - "discountCents" + "feesCents"),
  ADD CONSTRAINT "Order_tax_within_total" CHECK ("taxCents" <= "totalCents");

ALTER TABLE "OrderLine"
  ADD CONSTRAINT "OrderLine_quantity_positive" CHECK ("quantity" > 0),
  ADD CONSTRAINT "OrderLine_total_consistent" CHECK ("totalCents" = "quantity" * "unitPriceCents");

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_amount_positive" CHECK ("amountCents" > 0),
  ADD CONSTRAINT "Payment_refund_within_amount" CHECK ("refundedCents" >= 0 AND "refundedCents" <= "amountCents");

ALTER TABLE "Refund"
  ADD CONSTRAINT "Refund_amount_positive" CHECK ("amountCents" > 0);

ALTER TABLE "Voucher"
  ADD CONSTRAINT "Voucher_value_positive" CHECK ("value" > 0),
  ADD CONSTRAINT "Voucher_percent_max" CHECK ("kind" <> 'PERCENT' OR "value" <= 10000),
  ADD CONSTRAINT "Voucher_redemptions_within_limit" CHECK ("maxRedemptions" IS NULL OR "redemptionCount" <= "maxRedemptions");

ALTER TABLE "QuoteVersion"
  ADD CONSTRAINT "QuoteVersion_amounts" CHECK ("netCents" >= 0 AND "taxCents" >= 0 AND "grossCents" = "netCents" + "taxCents");

ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_amounts" CHECK ("grossCents" = "netCents" + "taxCents" AND "paidCents" >= 0),
  ADD CONSTRAINT "Invoice_issued_has_number" CHECK ("status" = 'DRAFT' OR "number" IS NOT NULL);

ALTER TABLE "InvoiceLine"
  ADD CONSTRAINT "InvoiceLine_amounts" CHECK ("grossCents" = "netCents" + "taxCents");

ALTER TABLE "NumberSequence"
  ADD CONSTRAINT "NumberSequence_positive" CHECK ("nextValue" >= 1);

-- ── Disposition: no double booking of vehicles or drivers ───────────────────
ALTER TABLE "Run"
  ADD CONSTRAINT "Run_time_order" CHECK ("endsAt" > "startsAt"),
  ADD CONSTRAINT "Run_required_seats" CHECK ("requiredSeats" >= 0);

ALTER TABLE "VehicleAssignment"
  ADD CONSTRAINT "VehicleAssignment_time_order" CHECK ("endsAt" > "startsAt"),
  ADD CONSTRAINT "VehicleAssignment_no_overlap"
    EXCLUDE USING gist ("vehicleId" WITH =, tsrange("startsAt", "endsAt", '[)') WITH &&)
    WHERE ("status" <> 'CANCELLED');

ALTER TABLE "DriverAssignment"
  ADD CONSTRAINT "DriverAssignment_time_order" CHECK ("endsAt" > "startsAt"),
  ADD CONSTRAINT "DriverAssignment_no_overlap"
    EXCLUDE USING gist ("driverId" WITH =, tsrange("startsAt", "endsAt", '[)') WITH &&)
    WHERE ("status" <> 'CANCELLED');

ALTER TABLE "MaintenanceWindow"
  ADD CONSTRAINT "MaintenanceWindow_time_order" CHECK ("endsAt" > "startsAt");

ALTER TABLE "DriverAbsence"
  ADD CONSTRAINT "DriverAbsence_time_order" CHECK ("endsAt" > "startsAt");

ALTER TABLE "DriverActivity"
  ADD CONSTRAINT "DriverActivity_time_order" CHECK ("endsAt" > "startsAt");

-- ── Append-only / immutable records ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION mt_forbid_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% on % is not allowed (append-only)', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER "AuditLog_append_only"
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION mt_forbid_change();

CREATE TRIGGER "PaymentEvent_no_delete"
  BEFORE DELETE ON "PaymentEvent"
  FOR EACH ROW EXECUTE FUNCTION mt_forbid_change();

CREATE TRIGGER "TicketValidation_append_only"
  BEFORE UPDATE OR DELETE ON "TicketValidation"
  FOR EACH ROW EXECUTE FUNCTION mt_forbid_change();

-- The original website inquiry is evidence and must stay unchanged.
CREATE OR REPLACE FUNCTION mt_inquiry_payload_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."originalPayload" IS DISTINCT FROM OLD."originalPayload" THEN
    RAISE EXCEPTION 'Inquiry.originalPayload is immutable' USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Inquiry_payload_immutable"
  BEFORE UPDATE ON "Inquiry"
  FOR EACH ROW EXECUTE FUNCTION mt_inquiry_payload_immutable();

-- Issued invoices are immutable except for payment status. Corrections go via credit notes.
CREATE OR REPLACE FUNCTION mt_invoice_issued_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."status" <> 'DRAFT' AND (
       NEW."number" IS DISTINCT FROM OLD."number"
    OR NEW."kind" IS DISTINCT FROM OLD."kind"
    OR NEW."netCents" IS DISTINCT FROM OLD."netCents"
    OR NEW."taxCents" IS DISTINCT FROM OLD."taxCents"
    OR NEW."grossCents" IS DISTINCT FROM OLD."grossCents"
    OR NEW."billingAddress" IS DISTINCT FROM OLD."billingAddress"
    OR NEW."issueDate" IS DISTINCT FROM OLD."issueDate"
    OR NEW."customerId" IS DISTINCT FROM OLD."customerId"
    OR NEW."companyId" IS DISTINCT FROM OLD."companyId") THEN
    RAISE EXCEPTION 'Issued invoice % cannot be modified; issue a credit note', OLD."number"
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Invoice_issued_immutable"
  BEFORE UPDATE ON "Invoice"
  FOR EACH ROW EXECUTE FUNCTION mt_invoice_issued_immutable();

CREATE TRIGGER "Invoice_no_delete_issued"
  BEFORE DELETE ON "Invoice"
  FOR EACH ROW WHEN (OLD."status" <> 'DRAFT') EXECUTE FUNCTION mt_forbid_change();

CREATE OR REPLACE FUNCTION mt_invoice_line_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_status "InvoiceStatus";
BEGIN
  SELECT "status" INTO v_status FROM "Invoice"
   WHERE "id" = COALESCE(NEW."invoiceId", OLD."invoiceId");
  IF v_status IS NOT NULL AND v_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Lines of an issued invoice cannot be changed' USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER "InvoiceLine_guard"
  BEFORE INSERT OR UPDATE OR DELETE ON "InvoiceLine"
  FOR EACH ROW EXECUTE FUNCTION mt_invoice_line_guard();
