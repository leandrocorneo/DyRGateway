"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PollingState<T> = {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string;
  updatedAt: string | null;
};

const initialState = <T,>(): PollingState<T> => ({
  data: null,
  loading: true,
  refreshing: false,
  error: "",
  updatedAt: null,
});

export function usePollingData<T>(key: string, loader: (signal: AbortSignal) => Promise<T>, intervalMs = 60000) {
  const loaderRef = useRef(loader);
  const controllerRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<PollingState<T>>(initialState);

  useEffect(() => { loaderRef.current = loader; }, [loader]);

  const run = useCallback(async (initial = false) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState((current) => ({ ...current, loading: initial || current.data === null, refreshing: !initial && current.data !== null, error: "" }));
    try {
      const data = await loaderRef.current(controller.signal);
      if (controller.signal.aborted) return;
      setState({ data, loading: false, refreshing: false, error: "", updatedAt: new Date().toISOString() });
    } catch {
      if (controller.signal.aborted) return;
      setState((current) => ({ ...current, loading: false, refreshing: false, error: "Nao foi possivel atualizar os dados de monitoramento." }));
    }
  }, []);

  useEffect(() => {
    setState(initialState<T>());
    void run(true);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void run(false);
    }, intervalMs);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void run(false);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
      controllerRef.current?.abort();
    };
  }, [intervalMs, key, run]);

  return { ...state, refresh: () => run(false) };
}