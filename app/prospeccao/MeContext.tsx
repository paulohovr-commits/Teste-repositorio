"use client";

import { createContext, useContext } from "react";
import type { Profile } from "@/lib/types";

export const MeContext = createContext<Profile | null>(null);

export function useMe(): Profile {
  const me = useContext(MeContext);
  if (!me) throw new Error("useMe fora do layout autenticado");
  return me;
}
