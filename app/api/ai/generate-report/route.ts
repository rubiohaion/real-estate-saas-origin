import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  reportData?: any;
  valuation?: any;
};

function fallbackText(body: Payload) {
  const rd = body.reportData ?? {};
  const pd = rd.propertyDescription ?? {};
  const vs = rd.valuationSummary ?? {};
  const address = [body.address, body.city, body.state, body.zip].filter(Boolean).join(", ");
  const sqft = pd.sqft ? `${pd.sqft} square feet` : "the reported living area";
  const beds = pd.bedrooms ? `${pd.bedrooms} bedrooms` : "the reported bedroom count";
  const baths = pd.bathrooms ? `${pd.bathrooms} bathrooms` : "the reported bathroom count";
  const condition = pd.condition || "the reported condition";
  const estimate = vs.estimatedValue ? `$${Number(vs.estimatedValue).toLocaleString()}` : "the calculated preliminary value";

  return {
    neighborhoodDescription:
      `The subject property is located at ${address || "the stated address"}. The neighborhood should be analyzed based on proximity to employment centers, schools, transportation routes, commercial services, and typical residential appeal. Marketability should be supported by local comparable sales and verified market activity before final reliance.`,
    valuationCommentary:
      `Based on the available property inputs, the subject is described as a property with ${sqft}, ${beds}, ${baths}, and ${condition}. The preliminary MVP valuation indication is ${estimate}. This indication should be treated as a starting point only and should be reconciled with verified comparable sales, condition adjustments, location factors, and any appraiser-specific assumptions before a final opinion of value is issued.`,
    limitingConditions:
      `This AI-assisted narrative is for draft support only. It does not replace appraiser judgment, independent verification, market-supported comparable analysis, or compliance review. The final report should be reviewed and approved by the responsible appraiser.`,
  };
}

function extractOutputText(json: any) {
  if (typeof json?.output_text === "string") return json.output_text;
  const output = json?.output;
  if (!Array.isArray(output)) return "";
  return output
    .flatMap((item: any) => (Array.isArray(item?.content) ? item.content : []))
    .map((c: any) => c?.text ?? "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Payload;
    const fallback = fallbackText(body);
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        data: {
          ...fallback,
          source: "fallback-template",
          note: "OPENAI_API_KEY is not configured. Returned a deterministic MVP narrative.",
        },
      });
    }

    const prompt = `You are helping draft a US residential appraisal report narrative. Write concise, professional English text. Do not claim verified facts that are not provided. Return strict JSON with keys: neighborhoodDescription, valuationCommentary, limitingConditions.\n\nInput:\n${JSON.stringify(body, null, 2)}`;

    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: prompt,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({
        data: {
          ...fallback,
          source: "fallback-template",
          note: "OpenAI request failed; returned fallback narrative.",
        },
      });
    }

    const json = await res.json();
    const text = extractOutputText(json);

    try {
      const parsed = JSON.parse(text);
      return NextResponse.json({ data: { ...parsed, source: "openai" } });
    } catch {
      return NextResponse.json({
        data: {
          ...fallback,
          valuationCommentary: text || fallback.valuationCommentary,
          source: "openai-text",
        },
      });
    }
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
