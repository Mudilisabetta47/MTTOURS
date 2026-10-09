# Zahlungen

> Status: Datenmodell und Datenbankregeln umgesetzt (Phase 1); Integration Phase 3.

## Stripe

- **Checkout Session** (gehostete Zahlungsseite, PCI-SAQ-A) mit `amount = Order.totalCents`, `metadata.orderId`, `client_reference_id`, `expires_at` = Hold-Ablauf.
- Idempotency-Key je Bestellung beim Anlegen der Session, damit doppelte Klicks keine zweite Session erzeugen.
- **Webhook** `POST /api/webhooks/stripe`:
  1. Rohen Body lesen, Signatur mit `STRIPE_WEBHOOK_SECRET` prüfen (`constructEvent`), sonst 400.
  2. `PaymentEvent` mit `(STRIPE, event.id)` einfügen; Unique-Verletzung = bereits verarbeitet → 200.
  3. Verarbeitung in einer Transaktion (siehe BOOKING_ENGINE Schritt 4), `processedAt` setzen.
  4. Fehler → `error` speichern, 500 zurückgeben (Stripe wiederholt), Alarm.
- Behandelte Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`/`_failed`, `checkout.session.expired`, `charge.refunded`, `charge.dispute.created`.
- Die Erfolgsseite liest nur den Status aus der eigenen Datenbank und zeigt „Zahlung wird geprüft“, bis der Webhook eingetroffen ist.

## PayPal

Orders API v2, `intent=CAPTURE`. Capture serverseitig; Webhook `PAYMENT.CAPTURE.COMPLETED`/`REFUNDED` mit Signaturprüfung über `verify-webhook-signature`; gleiche Idempotenz über `PaymentEvent`. Betrag und Währung gegen `Order.totalCents` prüfen.

## Erstattungen

Nur mit Berechtigung `refund.create`. `Refund(REQUESTED)` → Provider-API mit Idempotency-Key → Webhook bestätigt → `Payment.refundedCents` erhöhen (CHECK verhindert Überzahlung) → Order-Status → Audit.

## Doppelte Zahlungen

Eine Bestellung hat höchstens eine aktive Zahlungssitzung. Kommt dennoch eine zweite erfolgreiche Zahlung (z. B. PayPal und Karte), wird die zweite automatisch erstattet und im Dashboard gemeldet.

## Testbetrieb

Staging nutzt ausschließlich Stripe-Testschlüssel (`sk_test_…`) und PayPal-Sandbox. Production startet nicht mit einem Testschlüssel (`lib/env.ts`). Es gibt keine simulierte Zahlung im Code.
