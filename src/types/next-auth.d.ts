import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      handle?: string | null;
      reputation?: number;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    handle?: string | null;
    reputation?: number;
  }
}
