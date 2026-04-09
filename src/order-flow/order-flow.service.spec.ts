import { Test, TestingModule } from "@nestjs/testing";
import { OrderFlowService } from "./order-flow.service.js";
import { MercadoPagoService } from "../mercadopago/mercadopago.service.js";
import { DatabaseService } from "../database/db.service.js";

describe("OrderFlowService", () => {
  let service: OrderFlowService;

  const mockQueue = {
    add: jest.fn().mockResolvedValue({ id: "job-1" }),
  };

  const mockMpService = {
    getPaymentStatus: jest.fn(),
  };

  const insertReturning = jest.fn().mockResolvedValue([{ id: "order-1" }]);
  const insertValues = jest.fn().mockReturnValue({ returning: insertReturning });
  const mockInsert = jest.fn().mockReturnValue({ values: insertValues });

  const selectLimit = jest.fn().mockResolvedValue([]);
  const selectWhere = jest.fn().mockReturnValue({ limit: selectLimit });
  const selectFrom = jest.fn().mockReturnValue({ where: selectWhere });
  const mockSelect = jest.fn().mockReturnValue({ from: selectFrom });

  const mockDb = {
    insert: mockInsert,
    select: mockSelect,
  };

  const mockDbService = {
    getDb: jest.fn(() => mockDb),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderFlowService,
        { provide: "ORDER_QUEUE", useValue: mockQueue },
        { provide: MercadoPagoService, useValue: mockMpService },
        { provide: DatabaseService, useValue: mockDbService },
      ],
    }).compile();

    service = module.get<OrderFlowService>(OrderFlowService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should skip non-approved payments", async () => {
    mockMpService.getPaymentStatus.mockResolvedValue({
      status: "pending",
      externalReference: null,
      transactionAmount: null,
      payerEmail: null,
    });

    await service.handlePaymentNotification("PAY-123");
    expect(mockQueue.add).not.toHaveBeenCalled();
  });

  it("should create order and enqueue job for approved payment", async () => {
    mockMpService.getPaymentStatus.mockResolvedValue({
      status: "approved",
      externalReference: "ext-ref-1",
      transactionAmount: 150.0,
      payerEmail: "test@example.com",
    });

    await service.handlePaymentNotification("PAY-456");

    expect(mockInsert).toHaveBeenCalled();
    expect(mockQueue.add).toHaveBeenCalledWith(
      "process-order",
      expect.objectContaining({
        orderId: "order-1",
        mpPaymentId: "PAY-456",
      }),
      expect.any(Object),
    );
  });

  it("should not duplicate order for same payment", async () => {
    mockMpService.getPaymentStatus.mockResolvedValue({
      status: "approved",
      externalReference: null,
      transactionAmount: 100,
      payerEmail: null,
    });

    selectLimit.mockResolvedValueOnce([{ id: "existing-order" }]);

    await service.handlePaymentNotification("PAY-789");
    expect(mockQueue.add).not.toHaveBeenCalled();
  });
});
