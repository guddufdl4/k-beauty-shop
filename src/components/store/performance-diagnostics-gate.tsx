"use client";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
const Panel = dynamic(() => import("./performance-diagnostics"), {ssr: false});
export function PerformanceDiagnosticsGate() {
  const params = useSearchParams();
  return params.get("performance") === "1" ? <Panel/> : null;
}
