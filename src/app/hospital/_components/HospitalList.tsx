"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { getHospitalList } from "@/lib/db";

export function HospitalList() {
  const { data: hospitals } = useSuspenseQuery({
    queryKey: ["hospitalList"],
    queryFn: getHospitalList,
  });

  return (
    <ul>
      {hospitals.map(({ company }) => (
        <li key={company}>{company}</li>
      ))}
    </ul>
  );
}
