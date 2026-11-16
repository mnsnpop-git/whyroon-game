import { Suspense } from "react";
import PartyApp from "@/components/PartyApp";
import { Splash } from "@/components/ui/Splash";

export default function Page() {
  return (
    <Suspense fallback={<Splash />}>
      <PartyApp />
    </Suspense>
  );
}
