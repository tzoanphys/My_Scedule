import { createContext, useContext } from "react";

export const SessionContext = createContext(() => {});

export function useSignOut() {
  return useContext(SessionContext);
}
