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

    /**
     * Deduct credits based on MJML length.
     * Full template generation: base cost + per-character.
     * Section edits should pass a smaller length (~20% of full template).
     */
    const deductCredits = useCallback((mjmlLength: number) => {
        const cost = Math.max(5, Math.floor(mjmlLength / 50));
        setCredits((prev) => {
            const next = Math.max(0, prev - cost);
            localStorage.setItem(STORAGE_KEY, next.toString());
            return next;
        });
    }, []);

    /**
     * Deduct a fixed small cost for section-level edits.
     */
    const deductSectionCredits = useCallback((sectionLength: number) => {
        // Section edits cost ~20% of full generation
        const cost = Math.max(3, Math.floor(sectionLength / 100));
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
        deductSectionCredits,
        resetCredits,
        isInitializing
    };
}
