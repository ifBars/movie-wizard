import { createContext, type PropsWithChildren, use } from "react";
import { useMobileLibrary, type MobileLibrary } from "~/use-mobile-library";

const LibraryContext = createContext<MobileLibrary | null>(null);

export function LibraryProvider({ children }: PropsWithChildren) {
  const library = useMobileLibrary();

  return <LibraryContext.Provider value={library}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const library = use(LibraryContext);

  if (!library) {
    throw new Error("useLibrary must be used inside LibraryProvider");
  }

  return library;
}
