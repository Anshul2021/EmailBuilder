"use client";

import { useState, useEffect, useCallback } from "react";

const TOTAL_CREDITS = 5000;
const STORAGE_KEY = "ai_email_builder_credits";

export function useCredits() {
    const [credits, setCredits] = useState<number>(TOTAL_CREDITS);
    const [isInitializing, setIsInitializing] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            setCredits(parseInt(stored, 10));
        } else {
            localStorage.setItem(STORAGE_KEY, TOTAL_CREDITS.toString());
        }
        setIsInitializing(false);
    }, []);

    const deductCredits = useCallback((mjmlLength: number) => {
        // Basic logic: base cost + per character of generation
        const cost = Math.max(10, Math.floor(mjmlLength / 50));
        setCredits((prev) => {
            const next = Math.max(0, prev - cost);
            localStorage.setItem(STORAGE_KEY, next.toString());
            return next;
        });
    }, []);

    const resetCredits = useCallback(() => {
        localStorage.setItem(STORAGE_KEY, TOTAL_CREDITS.toString());
        setCredits(TOTAL_CREDITS);
    }, []);

    const percentage = (credits / TOTAL_CREDITS) * 100;

    return {
        credits,
        totalCredits: TOTAL_CREDITS,
        percentage,
        deductCredits,
        resetCredits,
        isInitializing
    };
}
