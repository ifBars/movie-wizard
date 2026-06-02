import { useEffect, useLayoutEffect } from "react";
import type { DependencyList, EffectCallback } from "react";

export function useExternalSyncEffect(effect: EffectCallback, dependencies: DependencyList) {
  useEffect(effect, dependencies);
}

export function useExternalLayoutSyncEffect(effect: EffectCallback, dependencies: DependencyList) {
  useLayoutEffect(effect, dependencies);
}

export function useMountEffect(effect: EffectCallback) {
  useEffect(effect, []);
}
