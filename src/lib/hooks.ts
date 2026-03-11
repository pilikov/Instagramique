"use client";

import { useState, useEffect, useCallback } from "react";

export function useInstagramAPI<T>(endpoint: string, params?: Record<string, string>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem("ig_access_token");

    if (!token) {
      setError("Нет токена авторизации");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const searchParams = new URLSearchParams({ endpoint });
      if (params) {
        Object.entries(params).forEach(([k, v]) => searchParams.set(k, v));
      }

      const response = await fetch(`/api/instagram?${searchParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();

      if (result.error) {
        setError(result.error);
      } else {
        setData(result);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка запроса");
    } finally {
      setLoading(false);
    }
  }, [endpoint, params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("ig_access_token");
    setIsAuthenticated(!!token);
    setLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem("ig_access_token");
    localStorage.removeItem("ig_user_id");
    window.location.href = "/";
  };

  return { isAuthenticated, loading, logout };
}
