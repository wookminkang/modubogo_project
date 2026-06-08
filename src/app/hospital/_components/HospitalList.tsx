"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { hospitalsQuery } from "@/lib/queries";

export function HospitalList() {
  const { data: hospitals } = useSuspenseQuery(hospitalsQuery());

  return (
    <ul>
      {hospitals.map(({ company }) => (
        <li key={company}>{company}</li>
      ))}
    </ul>
  );
}
