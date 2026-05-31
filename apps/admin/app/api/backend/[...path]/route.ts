import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";

const apiUrl = process.env.ADMIN_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const adminApiToken = process.env.ADMIN_API_TOKEN;

type RouteContext = {
  params: {
    path: string[];
  };
};

export async function GET(request: Request, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function PUT(request: Request, context: RouteContext) {
  return proxyRequest(request, context);
}

async function proxyRequest(request: Request, context: RouteContext) {
  const session = getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.NODE_ENV === "production" && !adminApiToken) {
    return NextResponse.json({ error: "Admin API token is not configured" }, { status: 500 });
  }

  const sourceUrl = new URL(request.url);
  const targetUrl = new URL(`/${context.params.path.join("/")}${sourceUrl.search}`, apiUrl);
  const body = request.method === "GET" ? undefined : await request.text();
  const response = await fetch(targetUrl, {
    method: request.method,
    headers: {
      "Content-Type": request.headers.get("Content-Type") ?? "application/json",
      "x-admin-token": adminApiToken ?? "local-admin-api-token",
      "x-actor-id": session.email,
      ...(request.headers.get("x-tenant-id")
        ? { "x-tenant-id": request.headers.get("x-tenant-id") as string }
        : {})
    },
    body,
    cache: "no-store"
  });

  const responseBody = await response.text();

  return new NextResponse(responseBody, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json"
    }
  });
}
