const TILE_COORDINATE = /^\d+$/

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ z: string; x: string; y: string }> }
) {
  const { z, x, y } = await params

  if (
    !TILE_COORDINATE.test(z) ||
    !TILE_COORDINATE.test(x) ||
    !TILE_COORDINATE.test(y) ||
    Number(z) > 19
  ) {
    return new Response("Invalid map tile coordinates", { status: 400 })
  }

  const tile = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`, {
    headers: {
      "User-Agent": "DOA Soil Test Kit map tiles (+https://github.com/Phromsawat/doa_soil_webapp)",
    },
    next: { revalidate: 86_400 },
  })

  if (!tile.ok || !tile.body) {
    return new Response(null, { status: tile.status || 502 })
  }

  return new Response(tile.body, {
    headers: {
      "Content-Type": tile.headers.get("Content-Type") ?? "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  })
}
