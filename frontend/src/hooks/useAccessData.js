import { useEffect, useMemo, useState } from "react";

import { accessApi } from "../api/client";

export function useAccessData() {
  const [state, setState] = useState({
    loading: true,
    error: "",
    stats: null,
    devices: [],
    visitors: [],
    alarms: [],
    logs: [],
    nighttimeRules: [],
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [stats, devices, visitors, alarms, logs, nighttimeRules] = await Promise.all([
          accessApi.stats(),
          accessApi.devices(),
          accessApi.visitors(),
          accessApi.alarms(),
          accessApi.doorLogs(),
          accessApi.nighttimeRules(),
        ]);
        if (mounted) {
          setState({ loading: false, error: "", stats, devices, visitors, alarms, logs, nighttimeRules });
        }
      } catch (error) {
        if (mounted) {
          setState((current) => ({ ...current, loading: false, error: error.message }));
        }
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const refreshNighttimeRules = async () => {
    try {
      const rules = await accessApi.nighttimeRules();
      setState((current) => ({ ...current, nighttimeRules: rules }));
    } catch (error) {
      console.error("Failed to refresh nighttime rules:", error);
    }
  };

  return useMemo(() => ({ ...state, refreshNighttimeRules }), [state]);
}
