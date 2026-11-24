"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function CheckoutButton({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function checkout() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Something went wrong");
      window.location.href = data.url; // Wire's hosted payment page
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <>
      <Button className="h-12 w-full rounded-full text-sm font-semibold" onClick={checkout} disabled={loading}>
        {loading ? "Opening payment…" : label}
      </Button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </>
  );
}
