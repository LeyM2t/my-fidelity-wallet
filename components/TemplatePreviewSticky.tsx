"use client";

import React from "react";

type Props = {
  isMobile: boolean;
  children: React.ReactNode;
};

export default function TemplatePreviewSticky({
  isMobile,
  children,
}: Props) {
  return (
    <div
      style={{
        position: isMobile ? "sticky" : "relative",
        top: isMobile ? 10 : undefined,
        zIndex: isMobile ? 40 : undefined,
        background: isMobile ? "rgba(250,250,249,0.96)" : "transparent",
        backdropFilter: isMobile ? "blur(10px)" : undefined,
        WebkitBackdropFilter: isMobile ? "blur(10px)" : undefined,
        borderRadius: isMobile ? 24 : undefined,
        padding: isMobile ? 8 : 0,
      }}
    >
      {children}
    </div>
  );
}