import { buildSitemapXml, getSitemapPage, getSitemapPageCount } from "@/lib/seo/sitemap";

export const revalidate = 3600;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const page = Number(id);

  if (!Number.isFinite(page) || page < 0) {
    return new Response("Not Found", { status: 404 });
  }

  const totalPages = getSitemapPageCount();
  if (page >= totalPages) {
    return new Response("Not Found", { status: 404 });
  }

  const entries = getSitemapPage(page);
  const xml = buildSitemapXml(entries);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
