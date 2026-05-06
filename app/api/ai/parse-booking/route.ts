import { GoogleGenAI } from "@google/genai";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

const RequestSchema = z.object({
  emailContent: z.string().min(20, "Nội dung email quá ngắn"),
  roomCatalog: z.array(
    z.object({
      id: z.string(),
      roomNumber: z.string(),
      roomTypeName: z.string(),
      status: z.string().optional(),
    })
  ).max(300).optional().default([]),
});

const ParsedBookingSchema = z.object({
  source: z.enum(["WALKIN", "FACEBOOK_ZALO", "BOOKING_COM", "AGODA", "AIRBNB", "OTHER"]).default("OTHER"),
  bookingCode: z.string().nullable(),
  guestFullName: z.string().nullable(),
  guestPhone: z.string().nullable(),
  guestIdNumber: z.string().nullable(),
  guestIdType: z.enum(["CCCD", "PASSPORT", "OTHER"]).nullable(),
  guestNationality: z.string().nullable(),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  numNights: z.number().int().nonnegative().nullable(),
  roomRate: z.number().nonnegative().nullable(),
  depositAmount: z.number().nonnegative().nullable(),
  specialRequests: z.string().nullable(),
  internalNotes: z.string().nullable(),
  roomId: z.string().nullable(),
  roomNumber: z.string().nullable(),
  roomTypeName: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()),
  totalNetRevenue: z.number().nonnegative().nullable().optional(),  
});

type ParsedBooking = z.infer<typeof ParsedBookingSchema>;

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("Thiếu cấu hình GEMINI_API_KEY hoặc GOOGLE_API_KEY");
  }

  return new GoogleGenAI({ apiKey });
}

function buildPrompt(emailContent: string, roomCatalog: z.infer<typeof RequestSchema>["roomCatalog"]) {
  const roomHints = roomCatalog.length > 0
    ? JSON.stringify(
        roomCatalog.map((room) => ({
          id: room.id,
          roomNumber: room.roomNumber,
          roomTypeName: room.roomTypeName,
          status: room.status ?? null,
        }))
      )
    : "[]";

  return [
    "Bạn là hệ thống trích xuất dữ liệu booking nghiệp vụ cao cho phần mềm khách sạn.",
    "Nhiệm vụ: đọc nội dung email booking và trả về JSON duy nhất theo đúng schema.",
    "Quy tắc CHUNG:",
    "- Chỉ trích xuất dữ liệu có trong email hoặc suy ra rất chắc chắn. Nếu không chắc, dùng null.",
    "- source phải là một trong: BOOKING_COM, AGODA, AIRBNB, WALKIN, FACEBOOK_ZALO, OTHER.",
    "- checkInDate và checkOutDate phải ở định dạng YYYY-MM-DD.",
    "- guestIdType chỉ dùng CCCD, PASSPORT hoặc OTHER.",
    "- roomId chỉ được điền khi email khớp rõ ràng với một phòng trong roomCatalog. Nếu không, để null.",
    "- warnings là mảng mô tả ngắn các trường còn thiếu, mơ hồ (ví dụ: 'Không thấy số điện thoại').",
    "",
    "Quy tắc QUAN TRỌNG VỀ TÀI CHÍNH (roomRate, depositAmount, numNights):",
    "- Tất cả các số tiền phải bỏ ký hiệu tiền tệ, chỉ giữ lại số (VD: 2082500).",
    "- Các nền tảng OTA (Agoda, Booking...) thường có 'Tổng giá phòng' (Gross) và 'Doanh thu thực nhận/Giá sau chiết khấu' (Net).",
    "- Bạn CHỈ ĐƯỢC PHÉP sử dụng 'Doanh thu thực nhận' (Net Price) làm cơ sở tính toán nếu email có đề cập.",
    "- Trường `roomRate` trong schema mang ý nghĩa là GIÁ CỦA 1 ĐÊM.",
    "- NẾU email cho biết tổng tiền của nhiều đêm, BẠN PHẢI TỰ ĐỘNG LÀM PHÉP CHIA: Lấy 'Doanh thu thực nhận' (hoặc tổng tiền) CHIA CHO số đêm (numNights) để ra `roomRate`. (Ví dụ: Doanh thu thực nhận là 2.082.500 VND cho 2 đêm, bạn phải trả về roomRate là 1041250).",
    "",
    `roomCatalog: ${roomHints}`,
    "",
    "Nội dung email:",
    "totalNetRevenue: Hãy lấy chính xác con số ở mục 'Doanh thu thực nhận' hoặc 'Giá sau chiết khấu'. Nếu không có, hãy lấy tổng giá.",
    emailContent,
  ].join("\n");
}

function normalizeParsedBooking(data: ParsedBooking): ParsedBooking {
  let finalRoomRate = data.roomRate;
  
  if (data.totalNetRevenue && data.numNights && data.numNights > 0) {
    finalRoomRate = Math.round(data.totalNetRevenue / data.numNights);
  }

  return {
    ...data,
    bookingCode: data.bookingCode?.trim() || null,
    guestFullName: data.guestFullName?.trim() || null,
    guestPhone: data.guestPhone?.replace(/[^\d+]/g, "") || null,
    guestIdNumber: data.guestIdNumber?.trim() || null,
    guestNationality: data.guestNationality?.trim() || null,
    specialRequests: data.specialRequests?.trim() || null,
    internalNotes: data.internalNotes?.trim() || null,
    roomId: data.roomId?.trim() || null,
    roomNumber: data.roomNumber?.trim() || null,
    roomTypeName: data.roomTypeName?.trim() || null,
    warnings: data.warnings.map((item) => item.trim()).filter(Boolean),
    roomRate: finalRoomRate,
  };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsedBody = RequestSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: parsedBody.error.issues[0]?.message || "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    const ai = getAiClient();
    const prompt = buildPrompt(parsedBody.data.emailContent, parsedBody.data.roomCatalog);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          additionalProperties: false,
          required: [
            "source",
            "bookingCode",
            "guestFullName",
            "guestPhone",
            "guestIdNumber",
            "guestIdType",
            "guestNationality",
            "checkInDate",
            "checkOutDate",
            "numNights",
            "roomRate",
            "depositAmount",
            "specialRequests",
            "internalNotes",
            "roomId",
            "roomNumber",
            "roomTypeName",
            "confidence",
            "warnings",
            "totalNetRevenue",
          ],
          properties: {
            source: { type: "string", enum: ["WALKIN", "FACEBOOK_ZALO", "BOOKING_COM", "AGODA", "AIRBNB", "OTHER"] },
            bookingCode: { type: ["string", "null"] },
            guestFullName: { type: ["string", "null"] },
            guestPhone: { type: ["string", "null"] },
            guestIdNumber: { type: ["string", "null"] },
            guestIdType: { type: ["string", "null"], enum: ["CCCD", "PASSPORT", "OTHER", null] },
            guestNationality: { type: ["string", "null"] },
            checkInDate: { type: ["string", "null"] },
            checkOutDate: { type: ["string", "null"] },
            numNights: { type: ["integer", "null"], minimum: 0 },
            roomRate: { type: ["number", "null"], minimum: 0 },
            depositAmount: { type: ["number", "null"], minimum: 0 },
            specialRequests: { type: ["string", "null"] },
            internalNotes: { type: ["string", "null"] },
            roomId: { type: ["string", "null"] },
            roomNumber: { type: ["string", "null"] },
            roomTypeName: { type: ["string", "null"] },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            warnings: {
              type: "array",
              items: { type: "string" },
            },
            totalNetRevenue: { type: ["number", "null"], minimum: 0 }, 
          },
        },
      },
    });

    const rawText = response.text?.trim();
    if (!rawText) {
      return NextResponse.json({ error: "AI không trả về dữ liệu" }, { status: 502 });
    }

    const parsedJson = JSON.parse(rawText);
    const parsedResult = ParsedBookingSchema.safeParse(parsedJson);
    if (!parsedResult.success) {
      return NextResponse.json({ error: "AI trả về sai định dạng dữ liệu" }, { status: 502 });
    }

    const data = normalizeParsedBooking(parsedResult.data);

    return NextResponse.json({ data });
  } catch (error) {
    console.error("POST /api/ai/parse-booking error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể phân tích email booking" },
      { status: 500 }
    );
  }
}