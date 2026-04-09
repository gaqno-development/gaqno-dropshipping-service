import { Test, TestingModule } from "@nestjs/testing";
import { createHmac } from "node:crypto";
import { MercadoPagoController } from "./mercadopago.controller.js";
import { MercadoPagoService } from "./mercadopago.service.js";
import { OrderFlowService } from "../order-flow/order-flow.service.js";

describe("MercadoPagoController", () => {
  let controller: MercadoPagoController;
  const mockMpService = {
    verifySignature: jest.fn(),
    getPaymentStatus: jest.fn(),
  };
  const mockOrderFlow = {
    handlePaymentNotification: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MercadoPagoController],
      providers: [
        { provide: MercadoPagoService, useValue: mockMpService },
        { provide: OrderFlowService, useValue: mockOrderFlow },
      ],
    }).compile();

    controller = module.get<MercadoPagoController>(MercadoPagoController);
  });

  it("should ack merchant_order topic without verification", async () => {
    const req = {
      body: { topic: "merchant_order" },
      headers: {},
    } as any;

    const result = await controller.handleWebhook(req);
    expect(result).toEqual({ received: true });
    expect(mockMpService.verifySignature).not.toHaveBeenCalled();
  });

  it("should reject missing signature headers", async () => {
    const req = {
      body: { type: "payment", data: { id: "123" } },
      headers: {},
    } as any;

    await expect(controller.handleWebhook(req)).rejects.toThrow(
      "Missing signature headers",
    );
  });

  it("should reject invalid signature", async () => {
    mockMpService.verifySignature.mockReturnValue(false);

    const req = {
      body: { type: "payment", data: { id: "123" } },
      headers: {
        "x-signature": "ts=123,v1=bad",
        "x-request-id": "req-1",
      },
    } as any;

    await expect(controller.handleWebhook(req)).rejects.toThrow("Invalid signature");
  });

  it("should process payment event and call orderFlow", async () => {
    mockMpService.verifySignature.mockReturnValue(true);
    mockOrderFlow.handlePaymentNotification.mockResolvedValue(undefined);

    const req = {
      body: { type: "payment", action: "payment.updated", data: { id: "PAY-123" } },
      headers: {
        "x-signature": "ts=123,v1=valid",
        "x-request-id": "req-1",
      },
    } as any;

    const result = await controller.handleWebhook(req);
    expect(result).toEqual({ received: true });
    expect(mockOrderFlow.handlePaymentNotification).toHaveBeenCalledWith("PAY-123");
  });

  it("should return 200 even if orderFlow throws", async () => {
    mockMpService.verifySignature.mockReturnValue(true);
    mockOrderFlow.handlePaymentNotification.mockRejectedValue(
      new Error("AliExpress timeout"),
    );

    const req = {
      body: { type: "payment", data: { id: "PAY-999" } },
      headers: {
        "x-signature": "ts=123,v1=valid",
        "x-request-id": "req-1",
      },
    } as any;

    const result = await controller.handleWebhook(req);
    expect(result).toEqual({ received: true });
  });
});

describe("MercadoPagoService.verifySignature", () => {
  it("should verify valid HMAC signature", () => {
    const secret = "test-webhook-secret";
    const dataId = "12345";
    const requestId = "req-abc";
    const ts = "1700000000";

    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const expectedHmac = createHmac("sha256", secret)
      .update(manifest)
      .digest("hex");

    const service = Object.create(MercadoPagoService.prototype);
    (service as any).webhookSecret = secret;

    const result = service.verifySignature(
      `ts=${ts},v1=${expectedHmac}`,
      requestId,
      dataId,
    );
    expect(result).toBe(true);
  });
});
