import { vi } from "vitest";

export const defaultMockSession = {
  user: {
    id: "user-123",
    fullName: "Nguyen Van A",
    email: "receptionist@test.com",
    role: "RECEPTIONIST",
    hotelId: "hotel-123",
  },
};

// Create a mock function with stable reference.
// The name MUST start with "mock" in Vitest to be hoisted.
export const mockGetServerSession = vi.fn(async () => defaultMockSession);

vi.mock("next-auth", () => ({
  getServerSession: mockGetServerSession,
}));

export const mockSession = {
  setSession: (session: typeof defaultMockSession | null) => {
    mockGetServerSession.mockResolvedValue(session as any);
  },
  reset: () => {
    mockGetServerSession.mockResolvedValue(defaultMockSession as any);
  },
};
