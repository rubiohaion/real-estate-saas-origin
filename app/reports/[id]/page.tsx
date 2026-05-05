"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function ReportPage() {
  const { id } = useParams();

  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateUS, setStateUS] = useState("");
  const [zip, setZip] = useState("");

  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqft, setSqft] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");

  const [propertyType, setPropertyType] = useState("Single Family");
  const [condition, setCondition] = useState("Good");

  const [marketConditions, setMarketConditions] = useState("");

  const [finalValue, setFinalValue] = useState("");
  const [aiText, setAiText] = useState("");

  const [loadingAI, setLoadingAI] = useState(false);

  function calculateValue() {
    let base = 300;

    if (city.toLowerCase().includes("beverly")) base = 1600;
    if (city.toLowerCase().includes("los angeles")) base = 800;

    let value = Number(sqft || 0) * base;

    if (condition === "Excellent") value *= 1.15;
    if (condition === "Poor") value *= 0.8;

    setFinalValue(Math.round(value).toString());
  }

  function generateAI() {
    setLoadingAI(true);

    setTimeout(() => {
      setAiText(
        `The subject property located in ${city} is estimated at approximately $${finalValue}. ` +
          `Based on market conditions and property characteristics, this value reflects a reasonable market-supported conclusion.`
      );
      setLoadingAI(false);
    }, 800);
  }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      {/* ADDRESS */}
      <h2>Property Address</h2>
      <input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
      <input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
      <input placeholder="State" value={stateUS} onChange={(e) => setStateUS(e.target.value)} />
      <input placeholder="ZIP" value={zip} onChange={(e) => setZip(e.target.value)} />

      {/* DETAILS */}
      <h3>Details</h3>
      <input placeholder="Beds" value={beds} onChange={(e) => setBeds(e.target.value)} />
      <input placeholder="Baths" value={baths} onChange={(e) => setBaths(e.target.value)} />
      <input placeholder="Sqft" value={sqft} onChange={(e) => setSqft(e.target.value)} />
      <input placeholder="Year Built" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} />

      {/* TYPE */}
      <h3>Property</h3>
      <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
        <option>Single Family</option>
        <option>Condo</option>
        <option>Townhouse</option>
        <option>Multi Family</option>
        <option>Apartment</option>
      </select>

      <select value={condition} onChange={(e) => setCondition(e.target.value)}>
        <option>Excellent</option>
        <option>Very Good</option>
        <option>Good</option>
        <option>Fair</option>
        <option>Poor</option>
      </select>

      {/* ACTIONS */}
      <div style={{ marginTop: 20 }}>
        <button onClick={calculateValue}>Calculate Value</button>
        <button onClick={generateAI}>
          {loadingAI ? "Generating..." : "Generate AI Report"}
        </button>
      </div>

      {/* VALUE */}
      <h2 style={{ marginTop: 30 }}>Final Opinion of Value</h2>
      <input value={finalValue} onChange={(e) => setFinalValue(e.target.value)} />

      {/* MARKET */}
      <h3>Market Conditions</h3>
      <textarea value={marketConditions} onChange={(e) => setMarketConditions(e.target.value)} />

      {/* AI */}
      <h3>Valuation Commentary</h3>
      <textarea value={aiText} onChange={(e) => setAiText(e.target.value)} />

      {/* SAVE */}
      <div style={{ marginTop: 30 }}>
        <button>Save</button>
        <button>Finalize</button>
      </div>
    </div>
  );
}
