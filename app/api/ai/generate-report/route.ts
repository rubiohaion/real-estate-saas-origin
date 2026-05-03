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

function money(v?: number | null) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "not available";
  return `$${Math.round(Number(v)).toLocaleString()}`;
}

function fallbackText(body: Payload) {
  const rd = body.reportData ?? {};
  const pd = rd.propertyDescription ?? {};
  const no = rd.neighborhoodOverview ?? {};
  const vs = rd.valuationSummary ?? body.valuation ?? {};
  const address = [body.address, body.city, body.state, body.zip].filter(Boolean).join(", ");

  const sqft = pd.sqft ? `${Number(pd.sqft).toLocaleString()} square feet` : "the reported living area";
  const beds = pd.bedrooms ? `${pd.bedrooms} bedrooms` : "the reported bedroom count";
  const baths = pd.bathrooms ? `${pd.bathrooms} bathrooms` : "the reported bathroom count";
  const yearBuilt = pd.yearBuilt ? `built in ${pd.yearBuilt}` : "with the reported effective age";
  const condition = pd.condition || "the reported condition";
  const propertyType = pd.propertyType || "residential property";

  const finalValue = vs.adjustedValue ?? vs.finalValue ?? vs.externalEstimate ?? vs.estimatedValue;
  const valueSource = vs.adjustedValue ? "appraiser-adjusted value" : vs.externalEstimate ? "external market indication" : "internal valuation indication";
  const internalEstimate = finalValue ? money(finalValue) : "the internal valuation indication";
  const internalRange = vs.estimatedLow && vs.estimatedHigh ? `${money(vs.estimatedLow)} to ${money(vs.estimatedHigh)}` : "the indicated internal range";
  const externalEstimate = vs.externalEstimate ? money(vs.externalEstimate) : null;
  const externalSentence = externalEstimate
    ? `An external market data indication of ${externalEstimate} was also saved and should be considered as a secondary reference point.`
    : `No verified external AVM is currently available; the analysis therefore relies on the internal model and should be supported with appraiser-selected comparable sales.`;

  return {
    neighborhoodDescription:
      `The subject property is located at ${address || "the stated address"}. The surrounding neighborhood should be reviewed for residential appeal, access to employment centers, schools, transportation routes, shopping, and other market influences. ${no.marketConditions ? `The selected market condition input is ${no.marketConditions}. ` : ""}Final neighborhood conclusions should be supported by verified local market evidence and comparable sales activity.`,
    valuationCommentary:
      `The subject is described as a ${propertyType} with ${sqft}, ${beds}, ${baths}, ${yearBuilt}, and ${condition}. The indicated value used in this draft narrative is ${internalEstimate}, based on the ${valueSource}, with an internal support range of ${internalRange}. ${externalSentence} The value conclusion should be reconciled with verified comparable sales, location differences, condition adjustments, age/quality considerations, and any appraiser-specific assumptions before final reliance.`,
    limitingConditions:
      `This AI-assisted narrative and internal valuation are for draft support only. They do not replace appraiser judgment, independent verification, market-supported comparable analysis, USPAP/compliance review, or the responsible appraiser's final reconciliation. The final report should be reviewed, supported, and approved by the responsible appraiser.`,
    riskMarketInsight:
      `Primary items requiring verification include comparable sale selection, property condition, legal/zoning assumptions, gross living area, recent renovations, market exposure, and any concessions or atypical transaction terms.`,
    source: "fallback-professional-template",
    note: "OPENAI_API_KEY is not configured or unavailable; returned a deterministic professional narrative.",
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
      return NextResponse.json({ data: fallback });
    }

    const prompt = `You are helping draft a US residential appraisal report narrative. Write concise, professional English text. Do not claim verified facts that are not provided. Do not state that this is a final opinion of value. Return strict JSON only with keys: neighborhoodDescription, valuationCommentary, limitingConditions, riskMarketInsight.\n\nInput data:\n${JSON.stringify(body, null, 2)}`;

    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: prompt,
        temperature: 0.25,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ data: { ...fallback, note: "OpenAI request failed; returned fallback narrative." } });
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
          note: "OpenAI returned text instead of JSON; stored the text as valuation commentary.",
        },
      });
    }
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
