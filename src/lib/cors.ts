const allowedOrigins = [
  process.env.FRONTEND_URL ?? "http://localhost:3000",
  process.env.ADMIN_URL ?? "http://localhost:3001",
];

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, Cookie, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };

  if (origin && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

export function handlePreflight(request: Request): Response | null {
  if (request.method !== "OPTIONS") {
    return null;
  }

  return new Response(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

export function withCors(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  const cors = corsHeaders(request);

  for (const [key, value] of Object.entries(cors)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
