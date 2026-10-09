-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'DISPATCHER', 'OFFICE', 'DRIVER', 'ACCOUNTING', 'CONTENT_MANAGER', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('PRIVATE', 'BUSINESS');

-- CreateEnum
CREATE TYPE "FileVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('PACKAGE_TOUR', 'TRANSPORT_ONLY', 'DAY_TRIP', 'LINE_TICKET', 'GROUP_TOUR');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InclusionKind" AS ENUM ('INCLUDED', 'EXCLUDED');

-- CreateEnum
CREATE TYPE "PriceUnit" AS ENUM ('PER_PERSON', 'PER_BOOKING');

-- CreateEnum
CREATE TYPE "DepartureStatus" AS ENUM ('DRAFT', 'ON_SALE', 'SALES_CLOSED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "StopKind" AS ENUM ('PICKUP', 'DROPOFF', 'PICKUP_DROPOFF', 'WAYPOINT');

-- CreateEnum
CREATE TYPE "StopEventStatus" AS ENUM ('PLANNED', 'ARRIVED', 'DEPARTED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE', 'RETIRED');

-- CreateEnum
CREATE TYPE "SeatKind" AS ENUM ('SEAT', 'DRIVER', 'GUIDE', 'DOOR', 'WC', 'STAIRS', 'KITCHEN');

-- CreateEnum
CREATE TYPE "HoldStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'RELEASED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SeatReservationStatus" AS ENUM ('HELD', 'BOOKED', 'RELEASED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OrderLineKind" AS ENUM ('FARE', 'STOP_SURCHARGE', 'OPTIONAL_SERVICE', 'DISCOUNT', 'FEE');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "PassengerType" AS ENUM ('ADULT', 'CHILD', 'INFANT');

-- CreateEnum
CREATE TYPE "ChangeRequestType" AS ENUM ('CANCELLATION', 'REBOOKING', 'NAME_CHANGE', 'OTHER');

-- CreateEnum
CREATE TYPE "ChangeRequestStatus" AS ENUM ('OPEN', 'APPROVED', 'REJECTED', 'DONE');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('ISSUED', 'USED', 'CANCELLED', 'VOID');

-- CreateEnum
CREATE TYPE "ValidationResult" AS ENUM ('VALID', 'ALREADY_USED', 'WRONG_DEPARTURE', 'WRONG_STOP', 'CANCELLED', 'INVALID');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'PAYPAL', 'BANK_TRANSFER', 'INVOICE', 'CASH');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'PENDING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "VoucherKind" AS ENUM ('PERCENT', 'AMOUNT');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUOTE_IN_PROGRESS', 'QUOTE_SENT', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "CharterOrderStatus" AS ENUM ('CONFIRMED', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'INVOICED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RunKind" AS ENUM ('SCHEDULED_DEPARTURE', 'CHARTER', 'TRANSFER', 'EMPTY_RUN');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('PLANNED', 'CONFIRMED', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('TENTATIVE', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DriverRole" AS ENUM ('PRIMARY', 'SECOND', 'RELIEF');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('FULL_TIME', 'PART_TIME', 'MINI_JOB', 'FREELANCE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('DRIVING', 'OTHER_WORK', 'AVAILABILITY', 'BREAK_REST');

-- CreateEnum
CREATE TYPE "OperationalEventType" AS ENUM ('RUN_STARTED', 'STOP_ARRIVED', 'STOP_DEPARTED', 'DELAY_REPORTED', 'ISSUE_REPORTED', 'VEHICLE_BREAKDOWN', 'DRIVER_CHANGED', 'VEHICLE_CHANGED', 'RUN_COMPLETED', 'NOTE');

-- CreateEnum
CREATE TYPE "MessagePriority" AS ENUM ('NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "InvoiceKind" AS ENUM ('INVOICE', 'CREDIT_NOTE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PageKind" AS ENUM ('HOME', 'LANDING', 'REGION', 'SERVICE', 'GUIDE', 'LEGAL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'SUPPRESSED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'DEAD');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "passwordHash" TEXT,
    "displayName" TEXT NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mfaSecretEnc" TEXT,
    "mfaEnabledAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" TEXT,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","role")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mfaVerified" BOOLEAN NOT NULL DEFAULT false,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT,
    "actorLabel" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "ipHash" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "key" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "response" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vatId" TEXT,
    "billingStreet" TEXT,
    "billingPostalCode" TEXT,
    "billingCity" TEXT,
    "billingCountry" TEXT NOT NULL DEFAULT 'DE',
    "billingEmail" TEXT,
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 14,
    "leitwegId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostCenter" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "CostCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrameworkContract" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "terms" JSONB NOT NULL,
    "fileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrameworkContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "type" "CustomerType" NOT NULL DEFAULT 'PRIVATE',
    "userId" TEXT,
    "companyId" TEXT,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "street" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'DE',
    "notes" TEXT,
    "marketingOptInAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT NOT NULL,
    "doneAt" TIMESTAMP(3),
    "customerId" TEXT,
    "companyId" TEXT,
    "inquiryId" TEXT,
    "createdById" TEXT,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoredFile" (
    "id" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "visibility" "FileVisibility" NOT NULL DEFAULT 'PRIVATE',
    "ownerType" TEXT,
    "ownerId" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "credit" TEXT,
    "isAiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "rightsConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "productType" "ProductType" NOT NULL,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "countryCode" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" JSONB NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "durationNights" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "hotelName" TEXT,
    "hotelStars" INTEGER,
    "hotelAddress" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "insolvencyCertificateRef" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripMedia" (
    "tripId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'GALLERY',
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TripMedia_pkey" PRIMARY KEY ("tripId","mediaId")
);

-- CreateTable
CREATE TABLE "TripItineraryDay" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "TripItineraryDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripInclusion" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "kind" "InclusionKind" NOT NULL,
    "text" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TripInclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptionalService" (
    "id" TEXT NOT NULL,
    "tripId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "unit" "PriceUnit" NOT NULL DEFAULT 'PER_PERSON',
    "taxRateBp" INTEGER,
    "maxPerBooking" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OptionalService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "street" TEXT,
    "postalCode" TEXT,
    "countryCode" TEXT NOT NULL DEFAULT 'DE',
    "platform" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Stop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripDeparture" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "departAt" TIMESTAMP(3) NOT NULL,
    "returnAt" TIMESTAMP(3),
    "status" "DepartureStatus" NOT NULL DEFAULT 'DRAFT',
    "capacity" INTEGER NOT NULL,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "heldCount" INTEGER NOT NULL DEFAULT 0,
    "bookingDeadline" TIMESTAMP(3),
    "seatSelection" BOOLEAN NOT NULL DEFAULT false,
    "seatLayoutId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripDeparture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartureFare" (
    "id" TEXT NOT NULL,
    "departureId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "conditions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DepartureFare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartureStop" (
    "id" TEXT NOT NULL,
    "departureId" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "kind" "StopKind" NOT NULL DEFAULT 'PICKUP',
    "plannedAt" TIMESTAMP(3) NOT NULL,
    "surchargeCents" INTEGER NOT NULL DEFAULT 0,
    "status" "StopEventStatus" NOT NULL DEFAULT 'PLANNED',
    "actualArrivalAt" TIMESTAMP(3),
    "actualDepartureAt" TIMESTAMP(3),

    CONSTRAINT "DepartureStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatLayout" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rows" INTEGER NOT NULL,
    "columns" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeatLayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seat" (
    "id" TEXT NOT NULL,
    "layoutId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "row" INTEGER NOT NULL,
    "col" INTEGER NOT NULL,
    "deck" INTEGER NOT NULL DEFAULT 1,
    "kind" "SeatKind" NOT NULL DEFAULT 'SEAT',
    "isBookable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Seat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "internalNumber" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "firstRegistration" TIMESTAMP(3),
    "seats" INTEGER NOT NULL,
    "vehicleClass" TEXT NOT NULL,
    "equipment" TEXT[],
    "status" "VehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "homeDepot" TEXT,
    "seatLayoutId" TEXT,
    "huDueAt" TIMESTAMP(3),
    "spDueAt" TIMESTAMP(3),
    "tachographDueAt" TIMESTAMP(3),
    "insuranceUntil" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleMedia" (
    "vehicleId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VehicleMedia_pkey" PRIMARY KEY ("vehicleId","mediaId")
);

-- CreateTable
CREATE TABLE "VehicleDocument" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceWindow" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapacityHold" (
    "id" TEXT NOT NULL,
    "departureId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "HoldStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CapacityHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatReservation" (
    "id" TEXT NOT NULL,
    "departureId" TEXT NOT NULL,
    "seatId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "SeatReservationStatus" NOT NULL DEFAULT 'HELD',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeatReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "customerId" TEXT,
    "email" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "subtotalCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "feesCents" INTEGER NOT NULL DEFAULT 0,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "accessTokenHash" TEXT,
    "consents" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "kind" "OrderLineKind" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "taxRateBp" INTEGER,
    "referenceType" TEXT,
    "referenceId" TEXT,

    CONSTRAINT "OrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "departureId" TEXT NOT NULL,
    "fareId" TEXT NOT NULL,
    "productType" "ProductType" NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "customerNote" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingPassenger" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "type" "PassengerType" NOT NULL DEFAULT 'ADULT',
    "boardingStopId" TEXT NOT NULL,
    "alightingStopId" TEXT,
    "seatReservationId" TEXT,

    CONSTRAINT "BookingPassenger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingChangeRequest" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" "ChangeRequestType" NOT NULL,
    "status" "ChangeRequestStatus" NOT NULL DEFAULT 'OPEN',
    "message" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,

    CONSTRAINT "BookingChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "passengerId" TEXT NOT NULL,
    "departureId" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'ISSUED',
    "qrTokenId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketValidation" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT,
    "departureId" TEXT,
    "departureStopId" TEXT,
    "result" "ValidationResult" NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scannedById" TEXT,
    "deviceId" TEXT,
    "offline" BOOLEAN NOT NULL DEFAULT false,
    "clientEventId" TEXT NOT NULL,

    CONSTRAINT "TicketValidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerRef" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "amountCents" INTEGER NOT NULL,
    "refundedCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "succeededAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "providerRef" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "VoucherKind" NOT NULL,
    "value" INTEGER NOT NULL,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "maxRedemptions" INTEGER,
    "redemptionCount" INTEGER NOT NULL DEFAULT 0,
    "minOrderCents" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoucherRedemption" (
    "voucherId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoucherRedemption_pkey" PRIMARY KEY ("voucherId","orderId")
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "source" TEXT NOT NULL,
    "tripType" TEXT NOT NULL,
    "originalPayload" JSONB NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "companyName" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "customerId" TEXT,
    "companyId" TEXT,
    "assignedToId" TEXT,
    "lostReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalculationParameterSet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "params" JSONB NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalculationParameterSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "inquiryId" TEXT,
    "customerId" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteVersion" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "calculation" JSONB NOT NULL,
    "parameterSetId" TEXT,
    "serviceDescription" JSONB NOT NULL,
    "passengerCount" INTEGER NOT NULL,
    "vehicleClass" TEXT NOT NULL,
    "netCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL,
    "grossCents" INTEGER NOT NULL,
    "taxRateBp" INTEGER NOT NULL,
    "pdfFileId" TEXT,
    "sentAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharterOrder" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "quoteVersionId" TEXT,
    "customerId" TEXT NOT NULL,
    "status" "CharterOrderStatus" NOT NULL DEFAULT 'CONFIRMED',
    "passengerCount" INTEGER NOT NULL,
    "luggageNotes" TEXT,
    "specialRequirements" TEXT,
    "agreedGrossCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharterOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharterStop" (
    "id" TEXT NOT NULL,
    "charterOrderId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "stopId" TEXT,
    "addressText" TEXT NOT NULL,
    "plannedAt" TIMESTAMP(3) NOT NULL,
    "kind" "StopKind" NOT NULL DEFAULT 'PICKUP_DROPOFF',

    CONSTRAINT "CharterStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "kind" "RunKind" NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'PLANNED',
    "departureId" TEXT,
    "charterOrderId" TEXT,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "originText" TEXT NOT NULL,
    "destinationText" TEXT NOT NULL,
    "requiredSeats" INTEGER NOT NULL,
    "isCrossBorder" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleAssignment" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'TENTATIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverAssignment" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "role" "DriverRole" NOT NULL DEFAULT 'PRIMARY',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'TENTATIVE',
    "complianceCheck" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "employmentStatus" "EmploymentStatus" NOT NULL DEFAULT 'FULL_TIME',
    "licenseClasses" TEXT[],
    "licenseValidUntil" TIMESTAMP(3),
    "qualificationValidUntil" TIMESTAMP(3),
    "driverCardValidUntil" TIMESTAMP(3),
    "medicalValidUntil" TIMESTAMP(3),
    "homeDepot" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverAbsence" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "kind" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "DriverAbsence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverDocument" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverActivity" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "runId" TEXT,

    CONSTRAINT "DriverActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceRuleSet" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "sources" JSONB NOT NULL,
    "params" JSONB NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceRuleSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalEvent" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "type" "OperationalEventType" NOT NULL,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportedById" TEXT,
    "source" TEXT NOT NULL,
    "clientEventId" TEXT NOT NULL,

    CONSTRAINT "OperationalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehiclePosition" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "runId" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracyM" DOUBLE PRECISION,
    "speedKmh" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehiclePosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageThread" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "runId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "priority" "MessagePriority" NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageReceipt" (
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "MessageReceipt_pkey" PRIMARY KEY ("messageId","userId")
);

-- CreateTable
CREATE TABLE "NumberSequence" (
    "scope" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "nextValue" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "NumberSequence_pkey" PRIMARY KEY ("scope","year")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "number" TEXT,
    "kind" "InvoiceKind" NOT NULL DEFAULT 'INVOICE',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "customerId" TEXT,
    "companyId" TEXT,
    "orderId" TEXT,
    "charterOrderId" TEXT,
    "correctsInvoiceId" TEXT,
    "billingAddress" JSONB NOT NULL,
    "issueDate" TIMESTAMP(3),
    "serviceFrom" TIMESTAMP(3),
    "serviceTo" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "netCents" INTEGER NOT NULL DEFAULT 0,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "grossCents" INTEGER NOT NULL DEFAULT 0,
    "paidCents" INTEGER NOT NULL DEFAULT 0,
    "pdfFileId" TEXT,
    "eInvoiceFormat" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "sort" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'Stk',
    "unitNetCents" INTEGER NOT NULL,
    "taxRateBp" INTEGER NOT NULL,
    "taxCategory" TEXT NOT NULL DEFAULT 'S',
    "netCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL,
    "grossCents" INTEGER NOT NULL,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "kind" "PageKind" NOT NULL,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "blocks" JSONB NOT NULL,
    "seoTitle" TEXT NOT NULL,
    "seoDescription" TEXT NOT NULL,
    "canonicalPath" TEXT,
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "ogImageId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'GLOBAL',
    "tripId" TEXT,
    "pageId" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Redirect" (
    "id" TEXT NOT NULL,
    "fromPath" TEXT NOT NULL,
    "toPath" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL DEFAULT 301,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Redirect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "providerMessageId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "relatedType" TEXT,
    "relatedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundJob" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 8,
    "lastError" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegacyIdMap" (
    "source" TEXT NOT NULL,
    "legacyTable" TEXT NOT NULL,
    "legacyId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "runId" TEXT NOT NULL,

    CONSTRAINT "LegacyIdMap_pkey" PRIMARY KEY ("source","legacyTable","legacyId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "UserRole_role_idx" ON "UserRole"("role");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_at_idx" ON "AuditLog"("entityType", "entityId", "at");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_at_idx" ON "AuditLog"("actorUserId", "at");

-- CreateIndex
CREATE INDEX "AuditLog_action_at_idx" ON "AuditLog"("action", "at");

-- CreateIndex
CREATE INDEX "IdempotencyKey_createdAt_idx" ON "IdempotencyKey"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CostCenter_companyId_code_key" ON "CostCenter"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_userId_key" ON "Customer"("userId");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_companyId_idx" ON "Customer"("companyId");

-- CreateIndex
CREATE INDEX "Customer_lastName_firstName_idx" ON "Customer"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "FollowUp_dueAt_doneAt_idx" ON "FollowUp"("dueAt", "doneAt");

-- CreateIndex
CREATE INDEX "StoredFile_ownerType_ownerId_idx" ON "StoredFile"("ownerType", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "StoredFile_bucket_key_key" ON "StoredFile"("bucket", "key");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_fileId_key" ON "MediaAsset"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_slug_key" ON "Trip"("slug");

-- CreateIndex
CREATE INDEX "Trip_status_productType_idx" ON "Trip"("status", "productType");

-- CreateIndex
CREATE INDEX "Trip_countryCode_idx" ON "Trip"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "TripItineraryDay_tripId_dayNumber_key" ON "TripItineraryDay"("tripId", "dayNumber");

-- CreateIndex
CREATE INDEX "TripInclusion_tripId_kind_sort_idx" ON "TripInclusion"("tripId", "kind", "sort");

-- CreateIndex
CREATE INDEX "OptionalService_tripId_isActive_idx" ON "OptionalService"("tripId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Stop_name_city_key" ON "Stop"("name", "city");

-- CreateIndex
CREATE UNIQUE INDEX "TripDeparture_code_key" ON "TripDeparture"("code");

-- CreateIndex
CREATE INDEX "TripDeparture_tripId_departAt_idx" ON "TripDeparture"("tripId", "departAt");

-- CreateIndex
CREATE INDEX "TripDeparture_status_departAt_idx" ON "TripDeparture"("status", "departAt");

-- CreateIndex
CREATE UNIQUE INDEX "DepartureFare_departureId_code_key" ON "DepartureFare"("departureId", "code");

-- CreateIndex
CREATE INDEX "DepartureStop_stopId_idx" ON "DepartureStop"("stopId");

-- CreateIndex
CREATE UNIQUE INDEX "DepartureStop_departureId_sequence_key" ON "DepartureStop"("departureId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "SeatLayout_name_key" ON "SeatLayout"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Seat_layoutId_label_key" ON "Seat"("layoutId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "Seat_layoutId_deck_row_col_key" ON "Seat"("layoutId", "deck", "row", "col");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_internalNumber_key" ON "Vehicle"("internalNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_licensePlate_key" ON "Vehicle"("licensePlate");

-- CreateIndex
CREATE INDEX "MaintenanceWindow_vehicleId_startsAt_idx" ON "MaintenanceWindow"("vehicleId", "startsAt");

-- CreateIndex
CREATE INDEX "CapacityHold_status_expiresAt_idx" ON "CapacityHold"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "CapacityHold_departureId_status_idx" ON "CapacityHold"("departureId", "status");

-- CreateIndex
CREATE INDEX "SeatReservation_departureId_status_idx" ON "SeatReservation"("departureId", "status");

-- CreateIndex
CREATE INDEX "SeatReservation_orderId_idx" ON "SeatReservation"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Order_accessTokenHash_key" ON "Order"("accessTokenHash");

-- CreateIndex
CREATE INDEX "Order_status_expiresAt_idx" ON "Order"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "Order_email_idx" ON "Order"("email");

-- CreateIndex
CREATE INDEX "OrderLine_orderId_idx" ON "OrderLine"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_number_key" ON "Booking"("number");

-- CreateIndex
CREATE INDEX "Booking_departureId_status_idx" ON "Booking"("departureId", "status");

-- CreateIndex
CREATE INDEX "Booking_orderId_idx" ON "Booking"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingPassenger_seatReservationId_key" ON "BookingPassenger"("seatReservationId");

-- CreateIndex
CREATE INDEX "BookingPassenger_bookingId_idx" ON "BookingPassenger"("bookingId");

-- CreateIndex
CREATE INDEX "BookingPassenger_boardingStopId_idx" ON "BookingPassenger"("boardingStopId");

-- CreateIndex
CREATE INDEX "BookingChangeRequest_status_createdAt_idx" ON "BookingChangeRequest"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_number_key" ON "Ticket"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_passengerId_key" ON "Ticket"("passengerId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_qrTokenId_key" ON "Ticket"("qrTokenId");

-- CreateIndex
CREATE INDEX "Ticket_departureId_status_idx" ON "Ticket"("departureId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TicketValidation_clientEventId_key" ON "TicketValidation"("clientEventId");

-- CreateIndex
CREATE INDEX "TicketValidation_ticketId_scannedAt_idx" ON "TicketValidation"("ticketId", "scannedAt");

-- CreateIndex
CREATE INDEX "TicketValidation_departureId_scannedAt_idx" ON "TicketValidation"("departureId", "scannedAt");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_provider_providerRef_key" ON "Payment"("provider", "providerRef");

-- CreateIndex
CREATE INDEX "PaymentEvent_processedAt_idx" ON "PaymentEvent"("processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_provider_providerEventId_key" ON "PaymentEvent"("provider", "providerEventId");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_providerRef_key" ON "Refund"("providerRef");

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_code_key" ON "Voucher"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Inquiry_number_key" ON "Inquiry"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Inquiry_dedupeKey_key" ON "Inquiry"("dedupeKey");

-- CreateIndex
CREATE INDEX "Inquiry_status_createdAt_idx" ON "Inquiry"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CalculationParameterSet_name_version_key" ON "CalculationParameterSet"("name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_number_key" ON "Quote"("number");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteVersion_quoteId_version_key" ON "QuoteVersion"("quoteId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "CharterOrder_number_key" ON "CharterOrder"("number");

-- CreateIndex
CREATE UNIQUE INDEX "CharterOrder_quoteVersionId_key" ON "CharterOrder"("quoteVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "CharterStop_charterOrderId_sequence_key" ON "CharterStop"("charterOrderId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "Run_number_key" ON "Run"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Run_departureId_key" ON "Run"("departureId");

-- CreateIndex
CREATE INDEX "Run_startsAt_endsAt_idx" ON "Run"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "Run_status_startsAt_idx" ON "Run"("status", "startsAt");

-- CreateIndex
CREATE INDEX "VehicleAssignment_vehicleId_startsAt_idx" ON "VehicleAssignment"("vehicleId", "startsAt");

-- CreateIndex
CREATE INDEX "DriverAssignment_driverId_startsAt_idx" ON "DriverAssignment"("driverId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_userId_key" ON "Driver"("userId");

-- CreateIndex
CREATE INDEX "DriverAbsence_driverId_startsAt_idx" ON "DriverAbsence"("driverId", "startsAt");

-- CreateIndex
CREATE INDEX "DriverActivity_driverId_startsAt_idx" ON "DriverActivity"("driverId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceRuleSet_code_version_key" ON "ComplianceRuleSet"("code", "version");

-- CreateIndex
CREATE UNIQUE INDEX "OperationalEvent_clientEventId_key" ON "OperationalEvent"("clientEventId");

-- CreateIndex
CREATE INDEX "OperationalEvent_runId_occurredAt_idx" ON "OperationalEvent"("runId", "occurredAt");

-- CreateIndex
CREATE INDEX "OperationalEvent_type_recordedAt_idx" ON "OperationalEvent"("type", "recordedAt");

-- CreateIndex
CREATE INDEX "VehiclePosition_vehicleId_recordedAt_idx" ON "VehiclePosition"("vehicleId", "recordedAt" DESC);

-- CreateIndex
CREATE INDEX "Message_threadId_createdAt_idx" ON "Message"("threadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE INDEX "Invoice_status_dueDate_idx" ON "Invoice"("status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceLine_invoiceId_sort_key" ON "InvoiceLine"("invoiceId", "sort");

-- CreateIndex
CREATE UNIQUE INDEX "Page_path_key" ON "Page"("path");

-- CreateIndex
CREATE INDEX "Page_kind_status_idx" ON "Page"("kind", "status");

-- CreateIndex
CREATE INDEX "Faq_scope_sort_idx" ON "Faq"("scope", "sort");

-- CreateIndex
CREATE UNIQUE INDEX "Redirect_fromPath_key" ON "Redirect"("fromPath");

-- CreateIndex
CREATE INDEX "Notification_status_createdAt_idx" ON "Notification"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_relatedType_relatedId_idx" ON "Notification"("relatedType", "relatedId");

-- CreateIndex
CREATE UNIQUE INDEX "BackgroundJob_dedupeKey_key" ON "BackgroundJob"("dedupeKey");

-- CreateIndex
CREATE INDEX "BackgroundJob_status_runAt_idx" ON "BackgroundJob"("status", "runAt");

-- CreateIndex
CREATE INDEX "LegacyIdMap_entityType_entityId_idx" ON "LegacyIdMap"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostCenter" ADD CONSTRAINT "CostCenter_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkContract" ADD CONSTRAINT "FrameworkContract_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkContract" ADD CONSTRAINT "FrameworkContract_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "StoredFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripMedia" ADD CONSTRAINT "TripMedia_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripMedia" ADD CONSTRAINT "TripMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripItineraryDay" ADD CONSTRAINT "TripItineraryDay_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripInclusion" ADD CONSTRAINT "TripInclusion_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionalService" ADD CONSTRAINT "OptionalService_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripDeparture" ADD CONSTRAINT "TripDeparture_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripDeparture" ADD CONSTRAINT "TripDeparture_seatLayoutId_fkey" FOREIGN KEY ("seatLayoutId") REFERENCES "SeatLayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartureFare" ADD CONSTRAINT "DepartureFare_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "TripDeparture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartureStop" ADD CONSTRAINT "DepartureStop_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "TripDeparture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartureStop" ADD CONSTRAINT "DepartureStop_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "Stop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "SeatLayout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_seatLayoutId_fkey" FOREIGN KEY ("seatLayoutId") REFERENCES "SeatLayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMedia" ADD CONSTRAINT "VehicleMedia_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMedia" ADD CONSTRAINT "VehicleMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "StoredFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceWindow" ADD CONSTRAINT "MaintenanceWindow_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacityHold" ADD CONSTRAINT "CapacityHold_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "TripDeparture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacityHold" ADD CONSTRAINT "CapacityHold_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatReservation" ADD CONSTRAINT "SeatReservation_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "TripDeparture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatReservation" ADD CONSTRAINT "SeatReservation_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "Seat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatReservation" ADD CONSTRAINT "SeatReservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "TripDeparture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_fareId_fkey" FOREIGN KEY ("fareId") REFERENCES "DepartureFare"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPassenger" ADD CONSTRAINT "BookingPassenger_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPassenger" ADD CONSTRAINT "BookingPassenger_boardingStopId_fkey" FOREIGN KEY ("boardingStopId") REFERENCES "DepartureStop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPassenger" ADD CONSTRAINT "BookingPassenger_alightingStopId_fkey" FOREIGN KEY ("alightingStopId") REFERENCES "DepartureStop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPassenger" ADD CONSTRAINT "BookingPassenger_seatReservationId_fkey" FOREIGN KEY ("seatReservationId") REFERENCES "SeatReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingChangeRequest" ADD CONSTRAINT "BookingChangeRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "BookingPassenger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "TripDeparture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketValidation" ADD CONSTRAINT "TicketValidation_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketValidation" ADD CONSTRAINT "TicketValidation_departureStopId_fkey" FOREIGN KEY ("departureStopId") REFERENCES "DepartureStop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherRedemption" ADD CONSTRAINT "VoucherRedemption_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherRedemption" ADD CONSTRAINT "VoucherRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteVersion" ADD CONSTRAINT "QuoteVersion_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteVersion" ADD CONSTRAINT "QuoteVersion_parameterSetId_fkey" FOREIGN KEY ("parameterSetId") REFERENCES "CalculationParameterSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteVersion" ADD CONSTRAINT "QuoteVersion_pdfFileId_fkey" FOREIGN KEY ("pdfFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharterOrder" ADD CONSTRAINT "CharterOrder_quoteVersionId_fkey" FOREIGN KEY ("quoteVersionId") REFERENCES "QuoteVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharterOrder" ADD CONSTRAINT "CharterOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharterStop" ADD CONSTRAINT "CharterStop_charterOrderId_fkey" FOREIGN KEY ("charterOrderId") REFERENCES "CharterOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharterStop" ADD CONSTRAINT "CharterStop_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "Stop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "TripDeparture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_charterOrderId_fkey" FOREIGN KEY ("charterOrderId") REFERENCES "CharterOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleAssignment" ADD CONSTRAINT "VehicleAssignment_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleAssignment" ADD CONSTRAINT "VehicleAssignment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverAssignment" ADD CONSTRAINT "DriverAssignment_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverAssignment" ADD CONSTRAINT "DriverAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverAbsence" ADD CONSTRAINT "DriverAbsence_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverDocument" ADD CONSTRAINT "DriverDocument_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverDocument" ADD CONSTRAINT "DriverDocument_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "StoredFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverActivity" ADD CONSTRAINT "DriverActivity_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalEvent" ADD CONSTRAINT "OperationalEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehiclePosition" ADD CONSTRAINT "VehiclePosition_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehiclePosition" ADD CONSTRAINT "VehiclePosition_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReceipt" ADD CONSTRAINT "MessageReceipt_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReceipt" ADD CONSTRAINT "MessageReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_charterOrderId_fkey" FOREIGN KEY ("charterOrderId") REFERENCES "CharterOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_correctsInvoiceId_fkey" FOREIGN KEY ("correctsInvoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_pdfFileId_fkey" FOREIGN KEY ("pdfFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Faq" ADD CONSTRAINT "Faq_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Faq" ADD CONSTRAINT "Faq_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
