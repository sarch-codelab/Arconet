import { prisma } from '@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json(
      {
        status: "ok",
        db: "up",
        latencyMs: Date.now() - started,
        uptimeSeconds: Math.round(process.uptime()),
        memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/health", error?.message);
    return Response.json(
      {
        status: "degraded",
        db: "down",
        latencyMs: Date.now() - started,
        error: "database unreachable",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
