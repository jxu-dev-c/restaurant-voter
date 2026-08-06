export function GET() {
  return Response.json(
    {
      status: "ok",
      service: "restaurant-voter",
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
