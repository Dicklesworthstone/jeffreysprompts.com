"use client";

import { SpotlightSearch } from "./SpotlightSearch";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <>
      {children}
      <SpotlightSearch />
    </>
  );
}

export default Providers;
